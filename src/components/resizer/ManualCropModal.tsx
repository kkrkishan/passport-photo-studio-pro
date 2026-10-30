import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop as CropIcon,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cropImageToCanvas } from '../../services/imageResizerEngine';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioPreset = 'free' | '1:1' | '3:4' | '4:5' | '35:45' | '16:9' | 'custom';

interface ManualCropModalProps {
  isOpen: boolean;
  imageDataUrl: string;
  originalFileName: string;
  onApplyCrop: (croppedDataUrl: string, croppedWidth: number, croppedHeight: number) => void;
  onRestoreOriginal: () => void;
  onClose: () => void;
}

export const ManualCropModal: React.FC<ManualCropModalProps> = ({
  isOpen,
  imageDataUrl,
  originalFileName,
  onApplyCrop,
  onRestoreOriginal,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [imgNaturalWidth, setImgNaturalWidth] = useState<number>(0);
  const [imgNaturalHeight, setImgNaturalHeight] = useState<number>(0);

  // Natural image coordinates for crop
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });

  // Ratio settings
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('free');
  const [customRatioW, setCustomRatioW] = useState<number>(35);
  const [customRatioH, setCustomRatioH] = useState<number>(45);

  // Viewport / zoom
  const [zoom, setZoom] = useState<number>(1);
  const [displayScale, setDisplayScale] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<'crop' | 'settings'>('crop');

  // Drag interaction state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialCrop: CropRect }>({
    clientX: 0,
    clientY: 0,
    initialCrop: { x: 0, y: 0, width: 0, height: 0 },
  });

  // Calculate target numerical ratio
  const getTargetRatio = useCallback((): number | null => {
    switch (aspectPreset) {
      case '1:1': return 1.0;
      case '3:4': return 3 / 4;
      case '4:5': return 4 / 5;
      case '35:45': return 35 / 45;
      case '16:9': return 16 / 9;
      case 'custom':
        return customRatioW > 0 && customRatioH > 0 ? customRatioW / customRatioH : null;
      case 'free':
      default:
        return null;
    }
  }, [aspectPreset, customRatioW, customRatioH]);

  // Load image dimensions and initialize crop box
  useEffect(() => {
    if (!isOpen || !imageDataUrl) return;

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setImgNaturalWidth(nw);
      setImgNaturalHeight(nh);

      // Default crop: centered 80% box
      const initialW = Math.round(nw * 0.8);
      const initialH = Math.round(nh * 0.8);
      const initialX = Math.round((nw - initialW) / 2);
      const initialY = Math.round((nh - initialH) / 2);

      setCrop({
        x: initialX,
        y: initialY,
        width: initialW,
        height: initialH,
      });
      setZoom(1);
    };
    img.src = imageDataUrl;
  }, [isOpen, imageDataUrl]);

  // Measure displayScale based on rendered image vs natural dimensions
  const updateDisplayScale = useCallback(() => {
    if (!imageRef.current || imgNaturalWidth === 0) return;
    const rect = imageRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setDisplayScale(rect.width / imgNaturalWidth);
    }
  }, [imgNaturalWidth]);

  useEffect(() => {
    updateDisplayScale();
    window.addEventListener('resize', updateDisplayScale);
    return () => window.removeEventListener('resize', updateDisplayScale);
  }, [updateDisplayScale, zoom]);

  // When aspect ratio preset changes, conform current crop box to ratio
  useEffect(() => {
    const ratio = getTargetRatio();
    if (!ratio || imgNaturalWidth === 0 || imgNaturalHeight === 0) return;

    setCrop((prev) => {
      let newW = prev.width;
      let newH = Math.round(newW / ratio);

      if (newH > imgNaturalHeight) {
        newH = imgNaturalHeight;
        newW = Math.round(newH * ratio);
      }

      let newX = Math.max(0, Math.min(prev.x, imgNaturalWidth - newW));
      let newY = Math.max(0, Math.min(prev.y, imgNaturalHeight - newH));

      return { x: newX, y: newY, width: newW, height: newH };
    });
  }, [aspectPreset, customRatioW, customRatioH, imgNaturalWidth, imgNaturalHeight, getTargetRatio]);

  // Reset crop to full or centered
  const handleResetCrop = () => {
    if (imgNaturalWidth === 0 || imgNaturalHeight === 0) return;
    const ratio = getTargetRatio();

    if (ratio) {
      let w = imgNaturalWidth * 0.9;
      let h = w / ratio;
      if (h > imgNaturalHeight * 0.9) {
        h = imgNaturalHeight * 0.9;
        w = h * ratio;
      }
      setCrop({
        x: Math.round((imgNaturalWidth - w) / 2),
        y: Math.round((imgNaturalHeight - h) / 2),
        width: Math.round(w),
        height: Math.round(h),
      });
    } else {
      setCrop({
        x: 0,
        y: 0,
        width: imgNaturalWidth,
        height: imgNaturalHeight,
      });
    }
  };

  // Drag start handler (corners, edges, or move box)
  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !activeHandle || displayScale <= 0) return;

    const deltaX = (e.clientX - dragStartRef.current.clientX) / displayScale;
    const deltaY = (e.clientY - dragStartRef.current.clientY) / displayScale;
    const init = dragStartRef.current.initialCrop;
    const ratio = getTargetRatio();

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    const minSize = 25;

    if (activeHandle === 'move') {
      newX = Math.max(0, Math.min(imgNaturalWidth - newW, init.x + deltaX));
      newY = Math.max(0, Math.min(imgNaturalHeight - newH, init.y + deltaY));
    } else {
      // Handle corner and edge adjustments
      if (activeHandle.includes('e')) {
        newW = Math.max(minSize, Math.min(imgNaturalWidth - init.x, init.width + deltaX));
      }
      if (activeHandle.includes('w')) {
        const potentialW = Math.max(minSize, init.width - deltaX);
        const shiftX = init.width - potentialW;
        if (init.x + shiftX >= 0) {
          newX = init.x + shiftX;
          newW = potentialW;
        }
      }
      if (activeHandle.includes('s')) {
        newH = Math.max(minSize, Math.min(imgNaturalHeight - init.y, init.height + deltaY));
      }
      if (activeHandle.includes('n')) {
        const potentialH = Math.max(minSize, init.height - deltaY);
        const shiftY = init.height - potentialH;
        if (init.y + shiftY >= 0) {
          newY = init.y + shiftY;
          newH = potentialH;
        }
      }

      // If aspect ratio is locked, maintain ratio
      if (ratio) {
        if (activeHandle === 'e' || activeHandle === 'w') {
          newH = Math.round(newW / ratio);
          if (newY + newH > imgNaturalHeight) {
            newH = imgNaturalHeight - newY;
            newW = Math.round(newH * ratio);
          }
        } else {
          newW = Math.round(newH * ratio);
          if (newX + newW > imgNaturalWidth) {
            newW = imgNaturalWidth - newX;
            newH = Math.round(newW / ratio);
          }
        }
      }
    }

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  }, [isDragging, activeHandle, displayScale, getTargetRatio, imgNaturalWidth, imgNaturalHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
  }, []);

  // Touch start handler
  const handleTouchStart = (e: React.TouchEvent, handle: string) => {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    setIsDragging(true);
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      initialCrop: { ...crop },
    };
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as any);
    }
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Apply Crop
  const handleApply = () => {
    if (!imageRef.current || crop.width <= 0 || crop.height <= 0) return;

    const croppedCanvas = cropImageToCanvas(
      imageRef.current,
      crop.x,
      crop.y,
      crop.width,
      crop.height
    );

    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    onApplyCrop(croppedDataUrl, crop.width, crop.height);
    onClose();
  };

  if (!isOpen) return null;

  // Screen coordinates of crop box
  const screenCropLeft = crop.x * displayScale;
  const screenCropTop = crop.y * displayScale;
  const screenCropWidth = crop.width * displayScale;
  const screenCropHeight = crop.height * displayScale;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Manual Photo Crop & Framing</span>
                <span className="text-[11px] font-mono text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  {crop.width} × {crop.height} px
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Drag corner and edge handles to crop unwanted areas. Coordinates are stored in native image pixels.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onRestoreOriginal();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Revert all crops and restore initial uploaded photo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Original</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden border-b border-slate-800 bg-slate-900 p-1.5 gap-2 shrink-0">
          <button
            onClick={() => setMobileTab('crop')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
              mobileTab === 'crop'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 bg-slate-800/80 hover:text-white'
            }`}
          >
            Crop Viewport
          </button>
          <button
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
              mobileTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 bg-slate-800/80 hover:text-white'
            }`}
          >
            Aspect Ratio & Size
          </button>
        </div>

        {/* Modal Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Visual Crop Viewport */}
          <div
            ref={containerRef}
            style={{ touchAction: 'none' }}
            className={`${mobileTab === 'crop' ? 'flex' : 'hidden'} md:flex flex-1 bg-[#070a13] relative overflow-hidden items-center justify-center p-3 sm:p-6`}
          >
            <div
              className="relative inline-block"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease',
              }}
            >
              {/* Natural Image */}
              <img
                ref={imageRef}
                src={imageDataUrl}
                alt="Crop Target"
                onLoad={updateDisplayScale}
                className="max-h-[55vh] sm:max-h-[60vh] max-w-[85vw] sm:max-w-[60vw] object-contain block pointer-events-none shadow-2xl"
              />

              {/* Darkened Mask Over Entire Image with Transparent Hole for Crop */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  clipPath: `polygon(
                    0% 0%,
                    100% 0%,
                    100% 100%,
                    0% 100%,
                    0% 0%,
                    ${screenCropLeft}px ${screenCropTop}px,
                    ${screenCropLeft}px ${screenCropTop + screenCropHeight}px,
                    ${screenCropLeft + screenCropWidth}px ${screenCropTop + screenCropHeight}px,
                    ${screenCropLeft + screenCropWidth}px ${screenCropTop}px,
                    ${screenCropLeft}px ${screenCropTop}px
                  )`,
                }}
              />

              {/* Interactive Crop Box Overlay */}
              <div
                style={{
                  position: 'absolute',
                  left: `${screenCropLeft}px`,
                  top: `${screenCropTop}px`,
                  width: `${screenCropWidth}px`,
                  height: `${screenCropHeight}px`,
                  touchAction: 'none',
                }}
                className="border-2 border-blue-400 cursor-move shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                onTouchStart={(e) => handleTouchStart(e, 'move')}
              >
                {/* Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* 4 Corner Handles with enlarged touch targets */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  onTouchStart={(e) => handleTouchStart(e, 'nw')}
                  className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-blue-500 border border-white rounded-sm cursor-nwse-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  onTouchStart={(e) => handleTouchStart(e, 'ne')}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-blue-500 border border-white rounded-sm cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  onTouchStart={(e) => handleTouchStart(e, 'sw')}
                  className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-blue-500 border border-white rounded-sm cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                  onTouchStart={(e) => handleTouchStart(e, 'se')}
                  className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-blue-500 border border-white rounded-sm cursor-nwse-resize shadow-md"
                />

                {/* 4 Edge Handles */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                  onTouchStart={(e) => handleTouchStart(e, 'n')}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-blue-500 rounded-sm cursor-ns-resize shadow-sm"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                  onTouchStart={(e) => handleTouchStart(e, 's')}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-blue-500 rounded-sm cursor-ns-resize shadow-sm"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                  onTouchStart={(e) => handleTouchStart(e, 'w')}
                  className="absolute top-1/2 -translate-y-1/2 -left-2 w-3 h-6 bg-white border border-blue-500 rounded-sm cursor-ew-resize shadow-sm"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                  onTouchStart={(e) => handleTouchStart(e, 'e')}
                  className="absolute top-1/2 -translate-y-1/2 -right-2 w-3 h-6 bg-white border border-blue-500 rounded-sm cursor-ew-resize shadow-sm"
                />

                {/* Dimension Badge inside box */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white font-semibold pointer-events-none border border-white/20">
                  {crop.width} × {crop.height} px
                </div>
              </div>
            </div>

            {/* Floating Zoom Bar */}
            <div className="absolute bottom-4 left-4 sm:left-6 flex items-center space-x-1 bg-slate-900/90 border border-slate-700 rounded-xl px-2 py-1 shadow-xl">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-1" />
              <button
                onClick={() => setZoom(1)}
                className="px-2 py-0.5 hover:bg-slate-800 rounded text-[10px] font-semibold text-slate-400 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right Sidebar: Aspect Ratio & Controls */}
          <div className={`${mobileTab === 'settings' ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-slate-950 border-l border-slate-800 p-4 sm:p-5 flex-col justify-between shrink-0 space-y-4 overflow-y-auto`}>
            <div className="space-y-5">
              {/* Aspect Ratio Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Aspect Ratio
                  </span>
                  {aspectPreset === 'free' ? (
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Unlock className="w-3 h-3" />
                      <span>Free</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-400 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'free', label: 'Free Crop' },
                    { id: '35:45', label: '35:45 (Passport)' },
                    { id: '1:1', label: '1:1 (Square)' },
                    { id: '3:4', label: '3:4 (Portrait)' },
                    { id: '4:5', label: '4:5 (Standard)' },
                    { id: '16:9', label: '16:9 (Landscape)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAspectPreset(p.id as AspectRatioPreset)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition ${
                        aspectPreset === p.id
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Ratio */}
                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 mt-2">
                  <button
                    onClick={() => setAspectPreset('custom')}
                    className={`w-full text-left text-xs font-semibold transition ${
                      aspectPreset === 'custom' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom Aspect Ratio:
                  </button>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={customRatioW}
                      onChange={(e) => {
                        setCustomRatioW(parseFloat(e.target.value) || 1);
                        setAspectPreset('custom');
                      }}
                      className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      placeholder="W"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={customRatioH}
                      onChange={(e) => {
                        setCustomRatioH(parseFloat(e.target.value) || 1);
                        setAspectPreset('custom');
                      }}
                      className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      placeholder="H"
                    />
                  </div>
                </div>
              </div>

              {/* Crop Stats */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Crop Geometry</span>
                <div className="flex justify-between text-slate-400">
                  <span>Image Size:</span>
                  <span className="font-mono text-white">{imgNaturalWidth} × {imgNaturalHeight} px</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cropped Output:</span>
                  <span className="font-mono text-emerald-400 font-bold">{crop.width} × {crop.height} px</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Offset (X, Y):</span>
                  <span className="font-mono text-slate-300">{crop.x}, {crop.y} px</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <button
                onClick={handleApply}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl shadow-blue-900/30 flex items-center justify-center space-x-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>

              <button
                onClick={handleResetCrop}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center justify-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Crop Box</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
