import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Wand2,
  RotateCcw,
  Maximize2,
  Check,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DocumentCorners, Point2D } from '../../types';
import {
  autoDetectDocumentCorners,
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
        // Run auto boundary detection
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

    // Draw base image
    ctx.drawImage(imageObj, 0, 0, w, h);

    // Darken exterior polygon
    ctx.save();
    ctx.fillStyle = 'rgba(11, 15, 25, 0.45)';
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
    ctx.lineWidth = Math.max(2, Math.round(w / 400));
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // Draw Corner Pins
    const pinRadius = Math.max(8, Math.round(w / 70));
    const pinKeys: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

    for (const key of pinKeys) {
      const pt = corners[key];
      const isSelected = activePin === key;

      // Glow halo
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius * 1.6, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.4)' : 'rgba(16, 185, 129, 0.3)';
      ctx.fill();

      // Pin circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#06b6d4' : '#10b981';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Inner target pip
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
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

      // 3.5x Magnification factor
      const zoomFactor = 3.5;
      const sampleSize = size / zoomFactor;

      lCtx.clearRect(0, 0, size, size);

      // Clip to circular loupe
      lCtx.save();
      lCtx.beginPath();
      lCtx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      lCtx.clip();

      // Draw magnified source region
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

      // Loupe crosshairs
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

  // Mouse drag handles
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

    const mouseX = (e.clientX - rect.left) * scale;
    const mouseY = (e.clientY - rect.top) * scale;

    // Detect closest corner pin within hit radius
    const hitRadius = Math.max(30, canvasRef.current.width / 25);
    const pinKeys: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

    for (const key of pinKeys) {
      const pt = corners[key];
      const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
      if (dist < hitRadius) {
        setActivePin(key);
        setLoupePos({ x: e.clientX, y: e.clientY });
        updateLoupe(key, pt);
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activePin || !canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / rect.width;

    const mouseX = Math.max(0, Math.min(imageObj.naturalWidth, (e.clientX - rect.left) * scale));
    const mouseY = Math.max(0, Math.min(imageObj.naturalHeight, (e.clientY - rect.top) * scale));

    const updatedCorners = {
      ...corners,
      [activePin]: { x: Math.round(mouseX), y: Math.round(mouseY) },
    };

    setCorners(updatedCorners);
    setLoupePos({ x: e.clientX, y: e.clientY });
    updateLoupe(activePin, { x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    setActivePin(null);
    setLoupePos(null);
  };

  // Re-run auto detection
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

  // Reset to default boundary inset
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

  // Execute Homography Transform
  const handleExecuteWarp = () => {
    if (!imageObj) return;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = imageObj.naturalWidth;
    sourceCanvas.height = imageObj.naturalHeight;
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageObj, 0, 0);

    // If target aspect is provided (e.g. 85.6 / 54 for ID card), compute exact proportions
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
      className="relative flex-1 bg-[#0b0f19] flex flex-col items-center justify-center p-4 overflow-hidden select-none"
    >
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-2xl">
        <button
          onClick={handleAutoDetect}
          className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
          title="Detect document edges automatically"
        >
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auto Detect Corners</span>
        </button>

        <button
          onClick={handleResetCorners}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Pins</span>
        </button>

        <div className="h-4 border-r border-slate-700" />

        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="p-1 text-slate-400 hover:text-white rounded transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-1 text-slate-400 hover:text-white rounded transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 border-r border-slate-700" />

        <button
          onClick={onCancel}
          className="px-3 py-1 text-slate-400 hover:text-white text-xs transition"
        >
          Cancel
        </button>

        <button
          onClick={handleExecuteWarp}
          className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition"
        >
          <span>Perspective Correction</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Viewport */}
      <div
        className="relative max-w-full max-h-[75vh] flex items-center justify-center cursor-crosshair transition-transform duration-75"
        style={{ transform: `scale(${zoom})` }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[70vh] max-w-[80vw] object-contain rounded-xl shadow-2xl border border-slate-800"
        />
      </div>

      {/* Real-time Magnifier Loupe Floating near active pin */}
      {activePin && loupePos && (
        <div
          className="fixed pointer-events-none z-50 rounded-full border-4 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] bg-black overflow-hidden"
          style={{
            left: `${loupePos.x + 30}px`,
            top: `${loupePos.y - 140}px`,
            width: '120px',
            height: '120px',
          }}
        >
          <canvas ref={loupeCanvasRef} className="w-full h-full" />
        </div>
      )}

      {/* Bottom Instructions Footer */}
      <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Drag the 4 corner pins onto the true edges of your ID card or document. Loupe will zoom in automatically.</span>
        </div>
        <div className="font-mono text-slate-400 text-[10px]">
          Homography Matrix Rectifier • Bilinear Pixel Interpolation
        </div>
      </div>
    </div>
  );
};
