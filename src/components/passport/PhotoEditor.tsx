import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  FileDown,
  Grid,
  Check,
  Sparkles,
  Pipette,
  Eraser,
  Paintbrush
} from 'lucide-react';
import { PhotoPreset, Adjustments, BackgroundSettings, CropBox } from '../../types';
import { applyAdjustments, applyStudioBackground, detectFaceAndAutoCrop } from '../../services/imageProcessing';
import { saveOrDownloadFile } from '../../services/exportHelper';

export interface PhotoEditorProps {
  imageSrc: string;
  preset: PhotoPreset;
  adjustments: Adjustments;
  background: BackgroundSettings;
  showFaceGuide: boolean;
  onToggleFaceGuide: () => void;
  cropBox?: CropBox | null;
  onCropChange?: (crop: CropBox) => void;
  onApplyCrop: (croppedCanvas: HTMLCanvasElement) => void;
  beforeAfterMode: boolean;
  previewOnly?: boolean;
  isEyedropperActive?: boolean;
  onPickColor?: (hex: string) => void;
  brushMaskCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  imageSrc,
  preset,
  adjustments,
  background,
  showFaceGuide,
  onToggleFaceGuide,
  cropBox: controlledCropBox,
  onCropChange,
  onApplyCrop,
  beforeAfterMode,
  previewOnly = false,
  isEyedropperActive = false,
  onPickColor,
  brushMaskCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const internalBrushMaskRef = useRef<HTMLCanvasElement | null>(null);
  const effectiveBrushCanvasRef = brushMaskCanvasRef || internalBrushMaskRef;

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [localCropBox, setLocalCropBox] = useState<CropBox>({ x: 0, y: 0, width: 300, height: 385 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialCropAtDrag, setInitialCropAtDrag] = useState<CropBox | null>(null);

  // Brush painting & visual cursor state
  const [isPaintingBrush, setIsPaintingBrush] = useState(false);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // Active crop box: use controlled prop if provided, otherwise fallback to local state
  const activeCropBox: CropBox = controlledCropBox || localCropBox;

  // Touch tracking ref for zero-jitter physical delta drag
  const touchStartRef = useRef<{
    clientX: number;
    clientY: number;
    scale: number;
    startCrop: CropBox;
    handle: string | null;
  } | null>(null);

  // Pinch-to-zoom tracking ref
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // RAF debouncing ref for smooth 60fps slider updates
  const animFrameRef = useRef<number | null>(null);

  // Target aspect ratio (width / height)
  const targetAspect = preset.widthMm / preset.heightMm;

  // Auto Face Detection & Auto Crop Handler
  const handleAutoCrop = useCallback(() => {
    if (!imageObj) return;
    const detected = detectFaceAndAutoCrop(imageObj, targetAspect);
    setLocalCropBox(detected);
    onCropChange?.(detected);
  }, [imageObj, targetAspect, onCropChange]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);

      // Only initialize crop box if not already set by parent
      if (!controlledCropBox) {
        // Automatically detect face or default center
        const detected = detectFaceAndAutoCrop(img, targetAspect);
        setLocalCropBox(detected);
        onCropChange?.(detected);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Fast GPU/Canvas Render with Pre-scaled Resolution (Buttery Smooth 60 FPS)
  const renderCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const origW = imageObj.naturalWidth;
    const origH = imageObj.naturalHeight;

    // Fast preview dimension (Capped at 1000px for instant real-time slider responsiveness)
    const maxPreviewDim = 1000;
    const scale = Math.min(1, maxPreviewDim / Math.max(origW, origH));
    const previewW = Math.round(origW * scale);
    const previewH = Math.round(origH * scale);

    canvas.width = previewW;
    canvas.height = previewH;

    ctx.clearRect(0, 0, previewW, previewH);
    ctx.save();

    // 1. Transformations: Rotation & Flip
    if (!beforeAfterMode) {
      ctx.translate(previewW / 2, previewH / 2);
      if (adjustments.rotation !== 0) {
        ctx.rotate((adjustments.rotation * Math.PI) / 180);
      }
      ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);
      ctx.translate(-previewW / 2, -previewH / 2);
    }

    ctx.drawImage(imageObj, 0, 0, previewW, previewH);
    ctx.restore();

    // 2. Adjustments & Studio Background on the optimized preview canvas
    if (!beforeAfterMode) {
      const imgData = ctx.getImageData(0, 0, previewW, previewH);

      // Fast single-pass adjustments
      applyAdjustments(imgData, adjustments);

      // Studio Background Replacement & Offline Smart AI Portrait
      if (background.enabled) {
        applyStudioBackground(imgData, background, effectiveBrushCanvasRef.current);
      }

      ctx.putImageData(imgData, 0, 0);
    }
  }, [imageObj, adjustments, background, beforeAfterMode]);

  // RequestAnimationFrame scheduler prevents JS thread blocking
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      renderCanvas();
    });
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderCanvas]);

  // Sample color from canvas pixel under screen coordinate
  const sampleColorAtPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.max(0, Math.min(canvas.width - 1, Math.round((clientX - rect.left) * scaleX)));
    const cy = Math.max(0, Math.min(canvas.height - 1, Math.round((clientY - rect.top) * scaleY)));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = ctx.getImageData(cx, cy, 1, 1).data;
    const hex = `#${((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1)}`;
    onPickColor?.(hex);
  };

  // Draw manual stroke (Erase or Restore) onto mask canvas
  const drawBrushPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    if (!effectiveBrushCanvasRef.current) {
      effectiveBrushCanvasRef.current = document.createElement('canvas');
    }
    const bCanvas = effectiveBrushCanvasRef.current;
    if (bCanvas.width !== canvas.width || bCanvas.height !== canvas.height) {
      bCanvas.width = canvas.width;
      bCanvas.height = canvas.height;
    }
    const bCtx = bCanvas.getContext('2d');
    if (!bCtx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    const displayScale = rect.width / canvas.width;
    const radius = Math.max(3, (background.brushSize || 25) / (2 * Math.max(0.1, displayScale)));

    bCtx.save();
    bCtx.beginPath();
    bCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    if (background.brushMode === 'erase') {
      bCtx.fillStyle = 'rgba(255, 0, 0, 1)';
    } else {
      bCtx.fillStyle = 'rgba(0, 255, 0, 1)';
    }
    bCtx.fill();
    bCtx.restore();

    renderCanvas();
  };

  // Mouse interaction for crop box resizing & moving or Eyedropper / Brush
  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
    if (isEyedropperActive) {
      sampleColorAtPoint(e.clientX, e.clientY);
      return;
    }

    if (background.brushMode && background.brushMode !== 'none') {
      setIsPaintingBrush(true);
      drawBrushPoint(e.clientX, e.clientY);
      setBrushCursor({ x: e.clientX, y: e.clientY, visible: true });
      return;
    }

    if (previewOnly) return;
    e.stopPropagation();
    if (!canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleToOrig = imageObj.naturalWidth / Math.max(1, rect.width);

    const clickX = (e.clientX - rect.left) * scaleToOrig;
    const clickY = (e.clientY - rect.top) * scaleToOrig;

    setDragStart({ x: clickX, y: clickY });
    setInitialCropAtDrag({ ...activeCropBox });
    setDragHandle(handle);
    setIsDraggingCrop(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (background.brushMode && background.brushMode !== 'none') {
      setBrushCursor({ x: e.clientX, y: e.clientY, visible: true });
      if (isPaintingBrush) {
        drawBrushPoint(e.clientX, e.clientY);
      }
      return;
    }

    if (previewOnly || !isDraggingCrop || !initialCropAtDrag || !canvasRef.current || !imageObj) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleToOrig = imageObj.naturalWidth / Math.max(1, rect.width);

    const currentX = (e.clientX - rect.left) * scaleToOrig;
    const currentY = (e.clientY - rect.top) * scaleToOrig;

    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;

    const imgW = imageObj.naturalWidth;
    const imgH = imageObj.naturalHeight;

    if (dragHandle === 'move') {
      let newX = initialCropAtDrag.x + dx;
      let newY = initialCropAtDrag.y + dy;
      newX = Math.max(0, Math.min(imgW - initialCropAtDrag.width, newX));
      newY = Math.max(0, Math.min(imgH - initialCropAtDrag.height, newY));

      const updated = { ...initialCropAtDrag, x: Math.round(newX), y: Math.round(newY) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'se') {
      let newW = Math.max(60, initialCropAtDrag.width + dx);
      let newH = newW / targetAspect;
      if (initialCropAtDrag.x + newW > imgW) {
        newW = imgW - initialCropAtDrag.x;
        newH = newW / targetAspect;
      }
      if (initialCropAtDrag.y + newH > imgH) {
        newH = imgH - initialCropAtDrag.y;
        newW = newH * targetAspect;
      }
      const updated = { ...initialCropAtDrag, width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'sw') {
      let newW = Math.max(60, initialCropAtDrag.width - dx);
      let newH = newW / targetAspect;
      let newX = initialCropAtDrag.x + (initialCropAtDrag.width - newW);
      if (newX < 0) {
        newW = initialCropAtDrag.x + initialCropAtDrag.width;
        newH = newW / targetAspect;
        newX = 0;
      }
      if (initialCropAtDrag.y + newH > imgH) {
        newH = imgH - initialCropAtDrag.y;
        newW = newH * targetAspect;
      }
      const updated = { x: Math.round(Math.max(0, newX)), y: initialCropAtDrag.y, width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'ne') {
      let newW = Math.max(60, initialCropAtDrag.width + dx);
      let newH = newW / targetAspect;
      let newY = initialCropAtDrag.y + (initialCropAtDrag.height - newH);
      if (newY < 0) {
        newH = initialCropAtDrag.y + initialCropAtDrag.height;
        newW = newH * targetAspect;
        newY = 0;
      }
      if (initialCropAtDrag.x + newW > imgW) {
        newW = imgW - initialCropAtDrag.x;
        newH = newW / targetAspect;
      }
      const updated = { x: initialCropAtDrag.x, y: Math.round(Math.max(0, newY)), width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'nw') {
      let newW = Math.max(60, initialCropAtDrag.width - dx);
      let newH = newW / targetAspect;
      let newX = initialCropAtDrag.x + (initialCropAtDrag.width - newW);
      let newY = initialCropAtDrag.y + (initialCropAtDrag.height - newH);
      if (newX < 0 || newY < 0) return;
      const updated = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    }
  };

  const handleMouseUp = () => {
    setIsPaintingBrush(false);
    setIsDraggingCrop(false);
    setDragHandle(null);
  };

  // Touch handlers with 2-Finger Pinch Zoom, Eyedropper, Brush, and Physical Delta Tracking
  const handleTouchStart = (e: React.TouchEvent, handle: string | null = null) => {
    // 2-Finger Pinch-to-Zoom detected
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isEyedropperActive) {
        sampleColorAtPoint(touch.clientX, touch.clientY);
        return;
      }

      if (background.brushMode && background.brushMode !== 'none') {
        setIsPaintingBrush(true);
        drawBrushPoint(touch.clientX, touch.clientY);
        setBrushCursor({ x: touch.clientX, y: touch.clientY, visible: true });
        return;
      }
    }

    if (previewOnly) return;
    if (e.touches.length !== 1 || !canvasRef.current || !imageObj) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleToOrig = imageObj.naturalWidth / Math.max(1, rect.width);

    touchStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      scale: scaleToOrig,
      startCrop: { ...activeCropBox },
      handle,
    };
    setIsDraggingCrop(true);
    setDragHandle(handle);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Handle 2-Finger Pinch-to-Zoom
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDistRef.current;
      const newZoom = Math.min(3.0, Math.max(0.4, pinchStartZoomRef.current * factor));
      setZoom(Number(newZoom.toFixed(2)));
      return;
    }

    if (e.touches.length === 1 && background.brushMode && background.brushMode !== 'none') {
      e.preventDefault();
      const touch = e.touches[0];
      setBrushCursor({ x: touch.clientX, y: touch.clientY, visible: true });
      if (isPaintingBrush) {
        drawBrushPoint(touch.clientX, touch.clientY);
      }
      return;
    }

    if (previewOnly || !touchStartRef.current || !canvasRef.current || !imageObj || e.touches.length === 0) return;
    e.preventDefault(); // Prevent Android WebView scroll runaway!
    const touch = e.touches[0];
    const { clientX: startX, clientY: startY, scale, startCrop, handle } = touchStartRef.current;

    const dx = (touch.clientX - startX) * scale;
    const dy = (touch.clientY - startY) * scale;

    const imgW = imageObj.naturalWidth;
    const imgH = imageObj.naturalHeight;

    if (handle === 'move') {
      let newX = startCrop.x + dx;
      let newY = startCrop.y + dy;
      newX = Math.max(0, Math.min(imgW - startCrop.width, newX));
      newY = Math.max(0, Math.min(imgH - startCrop.height, newY));

      const updated = { ...startCrop, x: Math.round(newX), y: Math.round(newY) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (handle === 'se') {
      let newW = Math.max(60, startCrop.width + dx);
      let newH = newW / targetAspect;
      if (startCrop.x + newW > imgW) {
        newW = imgW - startCrop.x;
        newH = newW / targetAspect;
      }
      if (startCrop.y + newH > imgH) {
        newH = imgH - startCrop.y;
        newW = newH * targetAspect;
      }
      const updated = { ...startCrop, width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (handle === 'sw') {
      let newW = Math.max(60, startCrop.width - dx);
      let newH = newW / targetAspect;
      let newX = startCrop.x + (startCrop.width - newW);
      if (newX < 0) {
        newW = startCrop.x + startCrop.width;
        newH = newW / targetAspect;
        newX = 0;
      }
      if (startCrop.y + newH > imgH) {
        newH = imgH - startCrop.y;
        newW = newH * targetAspect;
      }
      const updated = { x: Math.round(Math.max(0, newX)), y: startCrop.y, width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (handle === 'ne') {
      let newW = Math.max(60, startCrop.width + dx);
      let newH = newW / targetAspect;
      let newY = startCrop.y + (startCrop.height - newH);
      if (newY < 0) {
        newH = startCrop.y + startCrop.height;
        newW = newH * targetAspect;
        newY = 0;
      }
      if (startCrop.x + newW > imgW) {
        newW = imgW - startCrop.x;
        newH = newW / targetAspect;
      }
      const updated = { x: startCrop.x, y: Math.round(Math.max(0, newY)), width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    } else if (handle === 'nw') {
      let newW = Math.max(60, startCrop.width - dx);
      let newH = newW / targetAspect;
      let newX = startCrop.x + (startCrop.width - newW);
      let newY = startCrop.y + (startCrop.height - newH);
      if (newX < 0 || newY < 0) return;
      const updated = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    }
  };

  const handleTouchEnd = () => {
    setIsPaintingBrush(false);
    setBrushCursor(null);
    setIsDraggingCrop(false);
    setDragHandle(null);
    touchStartRef.current = null;
    pinchStartDistRef.current = null;
  };

  // Create full-resolution cropped canvas for single export & sheet layout
  const createFullQualityCroppedCanvas = (): HTMLCanvasElement | null => {
    if (!imageObj) return null;

    // Physical dimensions at 300 DPI
    const outW = Math.round((preset.widthMm / 25.4) * 300);
    const outH = Math.round((preset.heightMm / 25.4) * 300);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = outW;
    croppedCanvas.height = outH;
    const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw source crop directly from full-res image
    ctx.drawImage(
      imageObj,
      activeCropBox.x,
      activeCropBox.y,
      activeCropBox.width,
      activeCropBox.height,
      0,
      0,
      outW,
      outH
    );

    // 2. Apply adjustments & background on the cropped canvas (Fast <2ms!)
    if (!beforeAfterMode) {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      applyAdjustments(imgData, adjustments);
      if (background.enabled) {
        applyStudioBackground(imgData, background, effectiveBrushCanvasRef.current);
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return croppedCanvas;
  };

  // Generate cropped output canvas for SheetMaker
  const handleExportCropped = () => {
    const croppedCanvas = createFullQualityCroppedCanvas();
    if (croppedCanvas) {
      onApplyCrop(croppedCanvas);
    }
  };

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Directly save single cropped passport photo at 300 DPI to Gallery
  const handleSaveSinglePhoto = async (format: 'jpg' | 'png') => {
    const croppedCanvas = createFullQualityCroppedCanvas();
    if (!croppedCanvas || !imageObj) return;

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = croppedCanvas.toDataURL(mimeType, 0.96);
    const cleanPreset = preset.name.replace(/[^a-zA-Z0-9]/g, '_');
    const defaultName = `Passport_Photo_${cleanPreset}_300DPI.${format}`;

    const res = await saveOrDownloadFile({
      dataUrl,
      defaultName,
      format,
    });

    if (res.success) {
      setSaveStatus(res.filePath ? `Saved: ${res.filePath}` : `Saved (${format.toUpperCase()}) to Gallery!`);
      setTimeout(() => setSaveStatus(null), 3500);
    } else if (!res.canceled) {
      setSaveStatus(`Error saving photo: ${res.error || 'Unknown error'}`);
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  const getCanvasBounds = () => {
    if (!canvasRef.current || !imageObj) return { left: 0, top: 0, width: 0, height: 0, scale: 1 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Scale from original image coordinates to on-screen CSS pixels
    const scale = rect.width / (imageObj.naturalWidth || 1);
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, scale };
  };

  const bounds = getCanvasBounds();

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => handleMouseDown(e, null)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => handleTouchStart(e, null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className={`relative flex-1 w-full h-full bg-[#0b0f19] flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none ${
        isEyedropperActive ? 'cursor-crosshair' : background.brushMode && background.brushMode !== 'none' ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Visual Live Brush Circle Cursor */}
      {brushCursor && brushCursor.visible && background.brushMode && background.brushMode !== 'none' && (
        <div
          className="fixed pointer-events-none rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2 z-50 transition-opacity"
          style={{
            left: `${brushCursor.x}px`,
            top: `${brushCursor.y}px`,
            width: `${background.brushSize || 25}px`,
            height: `${background.brushSize || 25}px`,
            backgroundColor: background.brushMode === 'erase' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
          }}
        />
      )}

      {/* Eyedropper Instruction Banner */}
      {isEyedropperActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-full shadow-lg text-[11px] animate-pulse flex items-center space-x-1.5 pointer-events-none">
          <Pipette className="w-3.5 h-3.5" />
          <span>फोटो पर कहीं भी टैप करें - बैकग्राउंड कलर सेलेक्ट हो जाएगा</span>
        </div>
      )}

      {/* Active Brush Instruction Banner */}
      {!isEyedropperActive && background.brushMode && background.brushMode !== 'none' && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 ${
            background.brushMode === 'erase' ? 'bg-rose-600' : 'bg-emerald-600'
          } text-white font-bold px-3.5 py-1 rounded-full shadow-lg text-[11px] flex items-center space-x-1.5 pointer-events-none animate-fade-in`}
        >
          {background.brushMode === 'erase' ? <Eraser className="w-3.5 h-3.5" /> : <Paintbrush className="w-3.5 h-3.5" />}
          <span>{background.brushMode === 'erase' ? 'इरेज़र ब्रश एक्टिव (मिटाएं)' : 'रीस्टोर ब्रश एक्टिव (वापस लाएं)'}</span>
        </div>
      )}

      {/* Desktop Top Floating Toolbar */}
      {!previewOnly && (
        <div className="hidden md:flex w-[96%] max-w-3xl z-20 items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-blue-400 border-r border-slate-700 pr-2">
              {preset.name}
            </span>

            <button
              onClick={handleAutoCrop}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition active:scale-95"
              title="Auto Detect Face and Frame Crop Box"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto Crop</span>
            </button>

            <button
              onClick={onToggleFaceGuide}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs transition active:scale-95 ${
                showFaceGuide ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle Biometric Face Alignment Guides"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Face Guide</span>
            </button>

            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-[11px] font-mono text-slate-400 w-9 text-center hover:text-white"
              title="Reset Zoom (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSaveSinglePhoto('jpg')}
              className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 active:scale-95 transition"
              title="Save Single JPG"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>JPG</span>
            </button>
            <button
              onClick={() => handleSaveSinglePhoto('png')}
              className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 active:scale-95 transition"
              title="Save Single PNG"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportCropped}
              className="flex items-center space-x-1.5 px-3.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-900/40 active:scale-95 transition"
              title="Prepare Print Sheet"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Sheet Maker</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Badges for Mobile Canvas (Preset info & Auto Crop) */}
      <div className="flex md:hidden absolute top-2 left-2 z-20 items-center space-x-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 text-[11px] font-bold text-blue-400 shadow-lg">
        <span>{preset.name}</span>
        {!previewOnly && (
          <button
            onClick={handleAutoCrop}
            className="ml-1.5 flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-500/50 text-[10px] font-bold active:scale-95 shadow-sm"
            title="Auto Crop Face"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Auto Crop</span>
          </button>
        )}
      </div>

      {/* Mobile Floating Zoom Dock:
          In 50-50 Split view (previewOnly=true), positioned at BOTTOM-RIGHT (bottom-2 right-2)
          so that it NEVER collides with the [Done] button at TOP-RIGHT (top-2 right-2)! */}
      <div
        className={`flex md:hidden absolute ${
          previewOnly ? 'bottom-2 right-2' : 'top-2 right-2'
        } z-20 items-center space-x-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-700/80 shadow-lg`}
      >
        {!previewOnly && (
          <>
            <button
              onClick={onToggleFaceGuide}
              className={`p-1 rounded-lg transition active:scale-95 ${
                showFaceGuide ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Face Guide"
            >
              <Eye className="w-4 h-4" />
            </button>
            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
          </>
        )}
        <button
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
          className="p-1 text-slate-300 active:text-white active:scale-90"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="text-[10px] font-mono text-slate-300 w-8 text-center active:scale-90"
          title="Tap to Reset Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(2))))}
          className="p-1 text-slate-300 active:text-white active:scale-90"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Save Status Toast */}
      {saveStatus && (
        <div className="absolute top-14 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Editor Viewport with Pinch-Zoom scale support */}
      <div
        className="relative max-w-full max-h-[70vh] flex items-center justify-center transition-transform duration-75"
        style={{ transform: `scale(${zoom})` }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[66vh] max-w-[88vw] object-contain rounded-lg shadow-2xl border border-slate-800"
        />

        {/* Interactive Crop Box Overlay (Hidden when previewOnly) */}
        {!previewOnly && imageObj && bounds.scale > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${activeCropBox.x * bounds.scale}px`,
              top: `${activeCropBox.y * bounds.scale}px`,
              width: `${activeCropBox.width * bounds.scale}px`,
              height: `${activeCropBox.height * bounds.scale}px`,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            onTouchStart={(e) => handleTouchStart(e, 'move')}
            className="cursor-move border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(11,15,25,0.78)] z-10 box-border group"
          >
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-cyan-300"></div>
              <div className="border-r border-b border-cyan-300"></div>
              <div className="border-b border-cyan-300"></div>
              <div className="border-r border-b border-cyan-300"></div>
              <div className="border-r border-b border-cyan-300"></div>
              <div className="border-b border-cyan-300"></div>
              <div className="border-r border-cyan-300"></div>
              <div className="border-r border-cyan-300"></div>
              <div></div>
            </div>

            {/* Biometric Face Alignment Guidelines Overlay */}
            {showFaceGuide && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-2">
                <div className="w-full flex items-center justify-between border-t-2 border-dashed border-amber-400/80 -mt-0.5">
                  <span className="text-[9px] bg-slate-900/90 text-amber-300 px-1 rounded font-mono">Crown (75%)</span>
                </div>

                <div className="w-[68%] h-[72%] border-2 border-dashed border-cyan-300/80 rounded-[50%] flex flex-col items-center justify-between py-2 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <div className="w-full border-t border-cyan-400/60 mt-10 flex justify-between px-1">
                    <span className="text-[8px] bg-slate-900/80 text-cyan-300 font-mono -mt-3.5">Eyes</span>
                  </div>
                  <div className="border-b-2 border-dashed border-amber-400/80 w-16 mb-2">
                    <span className="text-[8px] bg-slate-900/90 text-amber-300 px-1 rounded font-mono block text-center">Chin</span>
                  </div>
                </div>

                <div className="w-full border-b border-dashed border-slate-400/50 -mb-0.5" />
              </div>
            )}

            {/* 4 Corner Resize Handles with enlarged touch targets */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              onTouchStart={(e) => handleTouchStart(e, 'nw')}
              className="absolute -top-3.5 -left-3.5 w-8 h-8 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nwse-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              onTouchStart={(e) => handleTouchStart(e, 'ne')}
              className="absolute -top-3.5 -right-3.5 w-8 h-8 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nesw-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              onTouchStart={(e) => handleTouchStart(e, 'sw')}
              className="absolute -bottom-3.5 -left-3.5 w-8 h-8 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nesw-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              onTouchStart={(e) => handleTouchStart(e, 'se')}
              className="absolute -bottom-3.5 -right-3.5 w-8 h-8 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nwse-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
          </div>
        )}
      </div>

      {/* Desktop Bottom Status Bar (Hidden when previewOnly) */}
      {!previewOnly && (
        <div className="hidden md:flex absolute bottom-3 left-6 right-6 items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {activeCropBox.width} × {activeCropBox.height} px
            </span>
            <span>Drag crop box or tap Auto Crop to frame head & shoulders. Head fills 70–80% of frame.</span>
          </div>
          {beforeAfterMode && (
            <div className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 text-xs font-semibold">
              Showing Original (Before)
            </div>
          )}
        </div>
      )}

      {/* Mobile Floating Bottom Action Dock (Hidden when previewOnly) */}
      {!previewOnly && (
        <div className="flex md:hidden absolute bottom-2 left-2 right-2 z-20 items-center justify-between gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/70 shadow-2xl">
          <button
            onClick={() => handleSaveSinglePhoto('jpg')}
            className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white rounded-xl text-xs font-bold border border-slate-700/80 active:scale-95 transition shadow-sm"
            title="Save Single JPG to Gallery"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Save JPG</span>
          </button>

          <button
            onClick={() => handleSaveSinglePhoto('png')}
            className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-white rounded-xl text-xs font-bold border border-slate-700/80 active:scale-95 transition shadow-sm"
            title="Save Single PNG to Gallery"
          >
            <FileDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handleExportCropped}
            className="flex-[1.2] flex items-center justify-center space-x-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40 active:scale-95 transition"
            title="Open Sheet Maker"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Sheet Maker</span>
          </button>
        </div>
      )}
    </div>
  );
};
