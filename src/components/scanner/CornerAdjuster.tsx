import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Wand2,
  RotateCcw,
  Maximize2,
  Check,
  CreditCard,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  X
} from 'lucide-react';
import { DocumentCorners, Point2D } from '../../types';
import {
  autoDetectDocumentCorners,
  getCardPresetCorners,
  getFullImageCorners,
  warpPerspective
} from '../../services/perspectiveTransform';

interface CornerAdjusterProps {
  imageSrc: string;
  initialCorners?: DocumentCorners | null;
  targetAspect?: number;
  onApplyWarp: (rectifiedCanvas: HTMLCanvasElement, corners: DocumentCorners) => void;
  onCancel: () => void;
}

export const CornerAdjuster: React.FC<CornerAdjusterProps> = ({
  imageSrc,
  initialCorners,
  targetAspect,
  onApplyWarp,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<DocumentCorners>({
    topLeft: { x: 50, y: 50 },
    topRight: { x: 400, y: 50 },
    bottomRight: { x: 400, y: 300 },
    bottomLeft: { x: 50, y: 300 },
  });

  const [activePin, setActivePin] = useState<keyof DocumentCorners | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // Load image & initialize corners
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);

      if (initialCorners) {
        setCorners(initialCorners);
      } else {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const detected = autoDetectDocumentCorners(imgData);
          setCorners(detected);
        }
      }
    };
    img.src = imageSrc;
  }, [imageSrc, initialCorners]);

  // Render canvas with image, boundary polygon, and corner handles
  const renderCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = imageObj.naturalWidth;
    const h = imageObj.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    // Base image
    ctx.drawImage(imageObj, 0, 0, w, h);

    // Darken exterior polygon
    ctx.save();
    ctx.fillStyle = 'rgba(11, 15, 25, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // Cut out document area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Redraw interior image
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(imageObj, 0, 0, w, h);
    ctx.restore();

    // Draw luminous polygon boundary edges
    ctx.save();
    ctx.strokeStyle = '#10b981'; // Emerald
    ctx.lineWidth = Math.max(3, Math.round(w / 350));
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // Draw Corner Pins
    const pinRadius = Math.max(12, Math.round(w / 60));
    const pinKeys: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

    for (const key of pinKeys) {
      const pt = corners[key];
      const isSelected = activePin === key;

      // Glow halo
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius * 1.8, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(16, 185, 129, 0.35)';
      ctx.fill();

      // Pin circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#06b6d4' : '#10b981';
      ctx.fill();
      ctx.lineWidth = Math.max(2, Math.round(pinRadius / 4));
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Inner target pip
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius / 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }, [imageObj, corners, activePin]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Update precision magnifier loupe when dragging a corner
  const updateLoupe = useCallback(
    (pinKey: keyof DocumentCorners, pt: Point2D) => {
      if (!loupeCanvasRef.current || !imageObj) return;
      const lCanvas = loupeCanvasRef.current;
      const lCtx = lCanvas.getContext('2d');
      if (!lCtx) return;

      const size = 120;
      lCanvas.width = size;
      lCanvas.height = size;

      const zoomFactor = 3.5;
      const sampleSize = size / zoomFactor;

      lCtx.clearRect(0, 0, size, size);

      // Clip circular loupe
      lCtx.save();
      lCtx.beginPath();
      lCtx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      lCtx.clip();

      // Magnified source region
      lCtx.drawImage(
        imageObj,
        pt.x - sampleSize / 2,
        pt.y - sampleSize / 2,
        sampleSize,
        sampleSize,
        0,
        0,
        size,
        size
      );

      // Crosshairs
      lCtx.strokeStyle = '#06b6d4';
      lCtx.lineWidth = 1.5;
      lCtx.beginPath();
      lCtx.moveTo(size / 2, 0);
      lCtx.lineTo(size / 2, size);
      lCtx.moveTo(0, size / 2);
      lCtx.lineTo(size, size / 2);
      lCtx.stroke();

      // Target bullseye
      lCtx.strokeStyle = '#ffffff';
      lCtx.lineWidth = 1.5;
      lCtx.beginPath();
      lCtx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
      lCtx.stroke();

      lCtx.restore();
    },
    [imageObj]
  );

  // Screen-space hit test: works reliably for both mouse and mobile touch
  const findPinAtClientCoord = (clientX: number, clientY: number): keyof DocumentCorners | null => {
    if (!canvasRef.current || !imageObj) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const pinKeys: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    let closestKey: keyof DocumentCorners | null = null;
    let minScreenDist = 55; // 55px touch target radius

    for (const key of pinKeys) {
      const pt = corners[key];
      const screenX = rect.left + (pt.x / imageObj.naturalWidth) * rect.width;
      const screenY = rect.top + (pt.y / imageObj.naturalHeight) * rect.height;
      const dist = Math.hypot(clientX - screenX, clientY - screenY);
      if (dist < minScreenDist) {
        minScreenDist = dist;
        closestKey = key;
      }
    }
    return closestKey;
  };

  const movePinToClientCoord = (pinKey: keyof DocumentCorners, clientX: number, clientY: number) => {
    if (!canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = imageObj.naturalWidth / rect.width;
    const scaleY = imageObj.naturalHeight / rect.height;

    const imgX = Math.max(0, Math.min(imageObj.naturalWidth, (clientX - rect.left) * scaleX));
    const imgY = Math.max(0, Math.min(imageObj.naturalHeight, (clientY - rect.top) * scaleY));

    const updated = {
      ...corners,
      [pinKey]: { x: Math.round(imgX), y: Math.round(imgY) },
    };
    setCorners(updated);
    setLoupePos({ x: clientX, y: clientY });
    updateLoupe(pinKey, { x: imgX, y: imgY });
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const pin = findPinAtClientCoord(e.clientX, e.clientY);
    if (pin) {
      setActivePin(pin);
      setLoupePos({ x: e.clientX, y: e.clientY });
      updateLoupe(pin, corners[pin]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activePin) {
      movePinToClientCoord(activePin, e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setActivePin(null);
    setLoupePos(null);
  };

  // Touch handlers for Mobile / Tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pin = findPinAtClientCoord(touch.clientX, touch.clientY);
      if (pin) {
        setActivePin(pin);
        setLoupePos({ x: touch.clientX, y: touch.clientY });
        updateLoupe(pin, corners[pin]);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activePin && e.touches.length > 0) {
      const touch = e.touches[0];
      movePinToClientCoord(activePin, touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    setActivePin(null);
    setLoupePos(null);
  };

  // Quick Action Presets
  const handleAutoDetect = () => {
    if (!imageObj) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageObj.naturalWidth;
    tempCanvas.height = imageObj.naturalHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageObj, 0, 0);
    const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const detected = autoDetectDocumentCorners(imgData);
    setCorners(detected);
  };

  const handleCardPreset = () => {
    if (!imageObj) return;
    setCorners(getCardPresetCorners(imageObj.naturalWidth, imageObj.naturalHeight));
  };

  const handleFullImagePreset = () => {
    if (!imageObj) return;
    setCorners(getFullImageCorners(imageObj.naturalWidth, imageObj.naturalHeight));
  };

  const handleResetCorners = () => {
    if (!imageObj) return;
    const w = imageObj.naturalWidth;
    const h = imageObj.naturalHeight;
    setCorners({
      topLeft: { x: Math.round(w * 0.08), y: Math.round(h * 0.08) },
      topRight: { x: Math.round(w * 0.92), y: Math.round(h * 0.08) },
      bottomRight: { x: Math.round(w * 0.92), y: Math.round(h * 0.92) },
      bottomLeft: { x: Math.round(w * 0.08), y: Math.round(h * 0.92) },
    });
  };

  // Perspective rectifying
  const handleExecuteWarp = () => {
    if (!imageObj) return;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = imageObj.naturalWidth;
    sourceCanvas.height = imageObj.naturalHeight;
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageObj, 0, 0);

    let targetW: number | undefined;
    let targetH: number | undefined;

    if (targetAspect) {
      const topDist = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
      const bottomDist = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
      targetW = Math.round(Math.max(topDist, bottomDist));
      targetH = Math.round(targetW / targetAspect);
    }

    const rectifiedCanvas = warpPerspective(sourceCanvas, corners, targetW, targetH);
    onApplyWarp(rectifiedCanvas, corners);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className="relative flex-1 bg-[#0b0f19] flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden select-none"
    >
      {/* Top Floating Controls - Responsive Wrap for Mobile */}
      <div className="w-full max-w-3xl z-20 flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleAutoDetect}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-semibold transition active:scale-95"
            title="Auto detect document borders"
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto Detect</span>
          </button>

          <button
            onClick={handleCardPreset}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-medium transition active:scale-95"
            title="Apply Aadhaar / PAN card ratio (85.6 x 54 mm)"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Card Preset</span>
            <span className="xs:hidden">Card</span>
          </button>

          <button
            onClick={handleFullImagePreset}
            className="flex items-center space-x-1 px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs transition active:scale-95"
            title="Expand corners to full image"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full</span>
          </button>

          <button
            onClick={handleResetCorners}
            className="flex items-center space-x-1 px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs transition active:scale-95"
            title="Reset to 8% margin"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 ml-auto">
          <button
            onClick={onCancel}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white rounded-xl text-xs transition"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteWarp}
            className="flex items-center space-x-1 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        className="relative flex-1 w-full max-h-[68vh] flex items-center justify-center cursor-crosshair overflow-hidden my-1"
        style={{ transform: `scale(${zoom})` }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[66vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-slate-800/80"
        />
      </div>

      {/* Real-time Magnifier Loupe Floating near active pin */}
      {activePin && loupePos && (
        <div
          className="fixed pointer-events-none z-50 rounded-full border-4 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] bg-black overflow-hidden"
          style={{
            left: `${Math.max(10, Math.min(window.innerWidth - 130, loupePos.x - 60))}px`,
            top: `${Math.max(10, loupePos.y - 140)}px`,
            width: '110px',
            height: '110px',
          }}
        >
          <canvas ref={loupeCanvasRef} className="w-full h-full" />
        </div>
      )}

      {/* Bottom Instructions / Info */}
      <div className="w-full max-w-3xl flex items-center justify-between px-2 text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">Drag 4 corners or tap <strong className="text-emerald-300">Auto Detect</strong> / <strong className="text-blue-300">Card Preset</strong></span>
        </div>
        <div className="hidden sm:block font-mono text-[10px] text-slate-500">
          Homography Rectifier
        </div>
      </div>
    </div>
  );
};
