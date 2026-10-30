import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  FileDown,
  Grid,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  PhotoPreset,
  Adjustments,
  BackgroundSettings,
  CropBox
} from '../../types';
import { applyStudioBackground } from '../../services/imageProcessing';
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [localCropBox, setLocalCropBox] = useState<CropBox>({ x: 0, y: 0, width: 300, height: 385 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialCropAtDrag, setInitialCropAtDrag] = useState<CropBox | null>(null);

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

  // Target aspect ratio (width / height)
  const targetAspect = preset.widthMm / preset.heightMm;

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);

      // Only initialize crop box if not already set by parent
      if (!controlledCropBox) {
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        let cropH = Math.min(imgH * 0.85, (imgW * 0.85) / targetAspect);
        let cropW = cropH * targetAspect;

        const initBox: CropBox = {
          x: Math.round((imgW - cropW) / 2),
          y: Math.round((imgH - cropH) * 0.35),
          width: Math.round(cropW),
          height: Math.round(cropH),
        };

        setLocalCropBox(initBox);
        onCropChange?.(initBox);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Adjust crop aspect when preset changes without moving center
  useEffect(() => {
    if (!imageObj) return;
    const cur = activeCropBox;
    let newW = cur.width;
    let newH = cur.width / targetAspect;
    if (newH > imageObj.naturalHeight) {
      newH = imageObj.naturalHeight;
      newW = newH * targetAspect;
    }
    const updated: CropBox = {
      ...cur,
      width: Math.round(newW),
      height: Math.round(newH),
    };
    setLocalCropBox(updated);
    onCropChange?.(updated);
  }, [targetAspect]);

  // Render canvas with adjustments and rotation
  const renderCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgW = imageObj.naturalWidth;
    const imgH = imageObj.naturalHeight;

    canvas.width = imgW;
    canvas.height = imgH;

    ctx.clearRect(0, 0, imgW, imgH);
    ctx.save();

    // 1. Transformations: Rotation & Flip
    if (!beforeAfterMode) {
      ctx.translate(imgW / 2, imgH / 2);
      if (adjustments.rotation !== 0) {
        ctx.rotate((adjustments.rotation * Math.PI) / 180);
      }
      ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);
      ctx.translate(-imgW / 2, -imgH / 2);
    }

    ctx.drawImage(imageObj, 0, 0, imgW, imgH);
    ctx.restore();

    // 2. Adjustments & Studio Background
    if (!beforeAfterMode) {
      const imgData = ctx.getImageData(0, 0, imgW, imgH);
      const data = imgData.data;

      const br = adjustments.brightness * 1.3;
      const contrastFactor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
      const expMultiplier = Math.pow(2, adjustments.exposure / 50);
      const sat = (adjustments.saturation + 100) / 100;
      const highlightShift = adjustments.highlights * 0.7;
      const shadowShift = adjustments.shadows * 0.7;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        r *= expMultiplier;
        g *= expMultiplier;
        b *= expMultiplier;

        // Brightness
        r += br;
        g += br;
        b += br;

        // Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Highlights & Shadows
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 128 && highlightShift !== 0) {
          const wLum = (lum - 128) / 128;
          r += highlightShift * wLum;
          g += highlightShift * wLum;
          b += highlightShift * wLum;
        } else if (lum <= 128 && shadowShift !== 0) {
          const wLum = (128 - lum) / 128;
          r += shadowShift * wLum;
          g += shadowShift * wLum;
          b += shadowShift * wLum;
        }

        // Saturation
        if (sat !== 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * sat;
          g = gray + (g - gray) * sat;
          b = gray + (b - gray) * sat;
        }

        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      }

      // 3. Studio Background Replacement
      if (background.enabled) {
        applyStudioBackground(imgData, background);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [imageObj, adjustments, background, beforeAfterMode]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse interaction for crop box resizing & moving
  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
    if (previewOnly) return;
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / Math.max(1, rect.width);

    const clickX = (e.clientX - rect.left) * scale;
    const clickY = (e.clientY - rect.top) * scale;

    setDragStart({ x: clickX, y: clickY });
    setInitialCropAtDrag({ ...activeCropBox });
    setDragHandle(handle);
    setIsDraggingCrop(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (previewOnly || !isDraggingCrop || !initialCropAtDrag || !canvasRef.current || !imageObj) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / Math.max(1, rect.width);

    const currentX = (e.clientX - rect.left) * scale;
    const currentY = (e.clientY - rect.top) * scale;

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
    } else if (dragHandle === 'nw') {
      let newW = Math.max(60, initialCropAtDrag.width - dx);
      let newH = newW / targetAspect;
      let newX = initialCropAtDrag.x + (initialCropAtDrag.width - newW);
      let newY = initialCropAtDrag.y + (initialCropAtDrag.height - newH);
      if (newX < 0 || newY < 0) return;
      const updated = { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) };
      setLocalCropBox(updated);
      onCropChange?.(updated);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(false);
    setDragHandle(null);
    setInitialCropAtDrag(null);
  };

  // Rock-solid Touch Interaction with Physical Delta (Prevents Scroll Runaway)
  const handleTouchStart = (e: React.TouchEvent, handle: string | null = null) => {
    if (previewOnly) return;
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / Math.max(1, rect.width);

    touchStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      scale,
      startCrop: { ...activeCropBox },
      handle,
    };
    setIsDraggingCrop(true);
    setDragHandle(handle);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (previewOnly || !touchStartRef.current || !canvasRef.current || !imageObj || e.touches.length === 0) return;
    e.preventDefault(); // Prevent Android WebView scroll jitter!
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
    touchStartRef.current = null;
    setIsDraggingCrop(false);
    setDragHandle(null);
  };

  // Generate cropped output canvas at 300 DPI
  const handleExportCropped = () => {
    if (!canvasRef.current || !imageObj) return;

    const sourceCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');

    const dpi = 300;
    const outW = Math.round((preset.widthMm / 25.4) * dpi);
    const outH = Math.round((preset.heightMm / 25.4) * dpi);

    croppedCanvas.width = outW;
    croppedCanvas.height = outH;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      sourceCanvas,
      activeCropBox.x,
      activeCropBox.y,
      activeCropBox.width,
      activeCropBox.height,
      0,
      0,
      outW,
      outH
    );

    onApplyCrop(croppedCanvas);
  };

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Directly save or download the single cropped passport photo at 300 DPI
  const handleSaveSinglePhoto = async (format: 'jpg' | 'png') => {
    if (!canvasRef.current || !imageObj) return;

    const sourceCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');

    const dpi = 300;
    const outW = Math.round((preset.widthMm / 25.4) * dpi);
    const outH = Math.round((preset.heightMm / 25.4) * dpi);

    croppedCanvas.width = outW;
    croppedCanvas.height = outH;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      sourceCanvas,
      activeCropBox.x,
      activeCropBox.y,
      activeCropBox.width,
      activeCropBox.height,
      0,
      0,
      outW,
      outH
    );

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
    if (!canvasRef.current) return { left: 0, top: 0, width: 0, height: 0, scale: 1 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / (canvasRef.current.width || 1);
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, scale };
  };

  const bounds = getCanvasBounds();

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className="relative flex-1 w-full h-full bg-[#0b0f19] flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
    >
      {/* Desktop Top Floating Toolbar (Hidden when previewOnly or on mobile) */}
      {!previewOnly && (
        <div className="hidden md:flex w-[96%] max-w-2xl z-20 items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-blue-400 border-r border-slate-700 pr-2">
              {preset.name}
            </span>

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
            <span className="text-[11px] font-mono text-slate-400 w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleSaveSinglePhoto('jpg')}
              className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              title="Save Single Edited Passport Photo (JPG)"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>JPG</span>
            </button>

            <button
              onClick={() => handleSaveSinglePhoto('png')}
              className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              title="Save Single Edited Passport Photo (PNG)"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>PNG</span>
            </button>

            <button
              onClick={handleExportCropped}
              className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-900/40 transition active:scale-95"
              title="Create Multi-Photo Print Sheet (4x6 or A4)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Sheet Maker</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Badges for Mobile Canvas (Hidden when previewOnly) */}
      {!previewOnly && (
        <>
          <div className="flex md:hidden absolute top-2 left-2 z-20 items-center space-x-1 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 text-[11px] font-bold text-blue-400 shadow-md">
            <span>{preset.name}</span>
          </div>

          <div className="flex md:hidden absolute top-2 right-2 z-20 items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-700/60 shadow-md">
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
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1 text-slate-400 active:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 w-7 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-400 active:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Floating Save Status Toast */}
      {saveStatus && (
        <div className="absolute top-14 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Editor Viewport */}
      <div
        className="relative max-w-full max-h-[70vh] flex items-center justify-center transition-transform duration-75"
        style={{ transform: `scale(${zoom})` }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[66vh] max-w-[88vw] object-contain rounded-lg shadow-2xl border border-slate-800 pointer-events-none"
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
              className="absolute -top-3 -left-3 w-7 h-7 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nwse-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              onTouchStart={(e) => handleTouchStart(e, 'ne')}
              className="absolute -top-3 -right-3 w-7 h-7 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nesw-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              onTouchStart={(e) => handleTouchStart(e, 'sw')}
              className="absolute -bottom-3 -left-3 w-7 h-7 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nesw-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              onTouchStart={(e) => handleTouchStart(e, 'se')}
              className="absolute -bottom-3 -right-3 w-7 h-7 bg-cyan-400 border-2 border-slate-900 rounded-md cursor-nwse-resize z-20 shadow-md flex items-center justify-center active:scale-125 transition-transform"
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
            <span>Drag crop box to frame head & shoulders. Head should fill 70–80% of frame.</span>
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
