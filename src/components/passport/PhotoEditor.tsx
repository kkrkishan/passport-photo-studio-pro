import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Sliders,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  FileDown,
  Grid
} from 'lucide-react';
import { PhotoPreset, Adjustments, BackgroundSettings } from '../../types';
import { applyAdjustments, applyStudioBackground } from '../../services/imageProcessing';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PhotoEditorProps {
  imageSrc: string;
  preset: PhotoPreset;
  adjustments: Adjustments;
  background: BackgroundSettings;
  showFaceGuide: boolean;
  onToggleFaceGuide: () => void;
  onCropChange?: (crop: CropBox) => void;
  onApplyCrop: (croppedCanvas: HTMLCanvasElement) => void;
  beforeAfterMode: boolean;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  imageSrc,
  preset,
  adjustments,
  background,
  showFaceGuide,
  onToggleFaceGuide,
  onCropChange,
  onApplyCrop,
  beforeAfterMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 300, height: 385 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialCropAtDrag, setInitialCropAtDrag] = useState<CropBox | null>(null);

  // Target aspect ratio (width / height)
  const targetAspect = preset.widthMm / preset.heightMm;

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);

      // Initialize crop box to centered optimal biometric portrait proportion
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      let cropH = Math.min(imgH * 0.85, (imgW * 0.85) / targetAspect);
      let cropW = cropH * targetAspect;

      const initBox: CropBox = {
        x: Math.round((imgW - cropW) / 2),
        y: Math.round((imgH - cropH) * 0.35), // slightly higher for face framing
        width: Math.round(cropW),
        height: Math.round(cropH),
      };

      setCropBox(initBox);
      onCropChange?.(initBox);
    };
    img.src = imageSrc;
  }, [imageSrc, preset.id]);

  // Adjust crop aspect when preset changes
  useEffect(() => {
    if (!imageObj) return;
    setCropBox((prev) => {
      let newW = prev.width;
      let newH = prev.width / targetAspect;
      if (newH > imageObj.naturalHeight) {
        newH = imageObj.naturalHeight;
        newW = newH * targetAspect;
      }
      const newBox = {
        ...prev,
        width: Math.round(newW),
        height: Math.round(newH),
      };
      onCropChange?.(newBox);
      return newBox;
    });
  }, [targetAspect]);

  // Render canvas with adjustments and rotation
  const renderCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
      applyAdjustments(imgData, adjustments);
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
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

    const clickX = (e.clientX - rect.left) * scale;
    const clickY = (e.clientY - rect.top) * scale;

    setDragStart({ x: clickX, y: clickY });
    setInitialCropAtDrag({ ...cropBox });
    setDragHandle(handle);
    setIsDraggingCrop(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop || !initialCropAtDrag || !canvasRef.current || !imageObj) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

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
      setCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'se') {
      // Bottom-Right resize keeping aspect ratio
      let newW = Math.max(80, initialCropAtDrag.width + dx);
      let newH = newW / targetAspect;

      if (initialCropAtDrag.x + newW > imgW) {
        newW = imgW - initialCropAtDrag.x;
        newH = newW / targetAspect;
      }
      if (initialCropAtDrag.y + newH > imgH) {
        newH = imgH - initialCropAtDrag.y;
        newW = newH * targetAspect;
      }

      const updated = {
        ...initialCropAtDrag,
        width: Math.round(newW),
        height: Math.round(newH),
      };
      setCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'nw') {
      // Top-Left resize keeping aspect ratio
      let newW = Math.max(80, initialCropAtDrag.width - dx);
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
      setCropBox(updated);
      onCropChange?.(updated);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(false);
    setDragHandle(null);
    setInitialCropAtDrag(null);
  };

  // Touch interaction for mobile crop box resizing & moving
  const handleTouchStart = (e: React.TouchEvent, handle: string | null = null) => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

    const clickX = (touch.clientX - rect.left) * scale;
    const clickY = (touch.clientY - rect.top) * scale;

    setDragStart({ x: clickX, y: clickY });
    setInitialCropAtDrag({ ...cropBox });
    setDragHandle(handle);
    setIsDraggingCrop(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingCrop || !initialCropAtDrag || !canvasRef.current || !imageObj || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

    const currentX = (touch.clientX - rect.left) * scale;
    const currentY = (touch.clientY - rect.top) * scale;

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
      setCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'se') {
      let newW = Math.max(80, initialCropAtDrag.width + dx);
      let newH = newW / targetAspect;

      if (initialCropAtDrag.x + newW > imgW) {
        newW = imgW - initialCropAtDrag.x;
        newH = newW / targetAspect;
      }
      if (initialCropAtDrag.y + newH > imgH) {
        newH = imgH - initialCropAtDrag.y;
        newW = newH * targetAspect;
      }

      const updated = {
        ...initialCropAtDrag,
        width: Math.round(newW),
        height: Math.round(newH),
      };
      setCropBox(updated);
      onCropChange?.(updated);
    } else if (dragHandle === 'nw') {
      let newW = Math.max(80, initialCropAtDrag.width - dx);
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
      setCropBox(updated);
      onCropChange?.(updated);
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingCrop(false);
    setDragHandle(null);
    setInitialCropAtDrag(null);
  };

  // Generate cropped output canvas
  const handleExportCropped = () => {
    if (!canvasRef.current || !imageObj) return;

    const sourceCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');

    // High resolution output calibrated to 300 DPI
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
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
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
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
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
      setSaveStatus(res.filePath ? `Saved: ${res.filePath}` : `Photo downloaded successfully (${format.toUpperCase()})!`);
      setTimeout(() => setSaveStatus(null), 3500);
    } else if (!res.canceled) {
      setSaveStatus(`Error saving photo: ${res.error || 'Unknown error'}`);
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  // Display coordinates calculation
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
      className="relative flex-1 bg-[#0b0f19] flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
    >
      {/* Top Floating Toolbar - Desktop Only (Hidden on Mobile to prevent overlapping) */}
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

      {/* Floating Badges for Mobile Canvas (Unobtrusive) */}
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

      {/* Floating Save Status Toast */}
      {saveStatus && (
        <div className="absolute top-16 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-medium animate-fade-in flex items-center space-x-2">
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

        {/* Interactive Crop Box Overlay */}
        {imageObj && bounds.scale > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${cropBox.x * bounds.scale}px`,
              top: `${cropBox.y * bounds.scale}px`,
              width: `${cropBox.width * bounds.scale}px`,
              height: `${cropBox.height * bounds.scale}px`,
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
                {/* Crown Guide (Top ~12%) */}
                <div className="w-full flex items-center justify-between border-t-2 border-dashed border-amber-400/80 -mt-0.5">
                  <span className="text-[9px] bg-slate-900/90 text-amber-300 px-1 rounded font-mono">Crown (75%)</span>
                </div>

                {/* Oval Head Area */}
                <div className="w-[68%] h-[72%] border-2 border-dashed border-cyan-300/80 rounded-[50%] flex flex-col items-center justify-between py-2 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  {/* Eye Level Line (~45% from top) */}
                  <div className="w-full border-t border-cyan-400/60 mt-10 flex justify-between px-1">
                    <span className="text-[8px] bg-slate-900/80 text-cyan-300 font-mono -mt-3.5">Eyes</span>
                  </div>
                  {/* Chin Level Line */}
                  <div className="border-b-2 border-dashed border-amber-400/80 w-16 mb-2">
                    <span className="text-[8px] bg-slate-900/90 text-amber-300 px-1 rounded font-mono block text-center">Chin</span>
                  </div>
                </div>

                {/* Bottom chest/shoulder line */}
                <div className="w-full border-b border-dashed border-slate-400/50 -mb-0.5" />
              </div>
            )}

            {/* Corner Resize Handles with enlarged touch targets */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              onTouchStart={(e) => handleTouchStart(e, 'nw')}
              className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-cyan-400 border-2 border-slate-900 rounded-sm cursor-nwse-resize z-20 shadow-md flex items-center justify-center"
            />
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              onTouchStart={(e) => handleTouchStart(e, 'se')}
              className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-cyan-400 border-2 border-slate-900 rounded-sm cursor-nwse-resize z-20 shadow-md flex items-center justify-center"
            />
          </div>
        )}
      </div>

      {/* Desktop Bottom Status / Instructions Bar */}
      <div className="hidden md:flex absolute bottom-3 left-6 right-6 items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {cropBox.width} × {cropBox.height} px
          </span>
          <span>Drag crop box to frame head & shoulders. Head should fill 70–80% of frame.</span>
        </div>
        {beforeAfterMode && (
          <div className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 text-xs font-semibold">
            Showing Original (Before)
          </div>
        )}
      </div>

      {/* Mobile Floating Bottom Action Dock - Clean & Native */}
      <div className="flex md:hidden absolute bottom-2 left-2 right-2 z-20 items-center justify-between gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/70 shadow-2xl">
        <button
          onClick={() => handleSaveSinglePhoto('jpg')}
          className="flex-1 flex items-center justify-center space-x-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white rounded-xl text-xs font-bold border border-slate-700/80 active:scale-95 transition shadow-sm"
          title="Save Single JPG to Gallery"
        >
          <FileDown className="w-3.5 h-3.5 text-blue-400" />
          <span>Save JPG</span>
        </button>

        <button
          onClick={() => handleSaveSinglePhoto('png')}
          className="flex-1 flex items-center justify-center space-x-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-white rounded-xl text-xs font-bold border border-slate-700/80 active:scale-95 transition shadow-sm"
          title="Save Single PNG to Gallery"
        >
          <FileDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>Save PNG</span>
        </button>

        <button
          onClick={handleExportCropped}
          className="flex-[1.2] flex items-center justify-center space-x-1.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40 active:scale-95 transition"
          title="Open Sheet Maker"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Sheet Maker</span>
        </button>
      </div>
    </div>
  );
};
