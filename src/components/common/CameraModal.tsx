import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Video } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  mode?: 'face' | 'document';
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  mode = 'face',
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Enumerate camera devices
  useEffect(() => {
    if (!isOpen) return;

    const getDevices = async () => {
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err: any) {
        console.error('Error listing cameras:', err);
      }
    };

    getDevices();
  }, [isOpen]);

  // Start camera stream
  useEffect(() => {
    if (!isOpen || capturedImage) return;

    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setLoading(true);
      setError(null);

      // Stop old stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err: any) {
        console.error('Camera stream error:', err);
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please grant camera access in Windows Settings.'
            : 'No active camera could be found or the camera is in use by another application.'
        );
      } finally {
        setLoading(false);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, selectedDeviceId, capturedImage]);

  // Handle capture snapshot
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);

    // Stop live stream while viewing captured image
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {mode === 'face' ? 'Passport Biometric Camera Capture' : 'Document Scanner Camera Capture'}
              </h3>
              <p className="text-xs text-slate-400">Position directly in front of the lens with even lighting</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Snapshot Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-6 max-w-md">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <div className="text-sm font-semibold text-white mb-1">Camera Not Accessible</div>
              <div className="text-xs text-slate-400 mb-4">{error}</div>
              <button
                onClick={() => setSelectedDeviceId(selectedDeviceId)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-200 transition"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Real-time biometric guide overlay */}
              {mode === 'face' ? (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Oval head guide */}
                  <div className="w-56 h-72 border-2 border-dashed border-cyan-400/80 rounded-[50%] flex flex-col items-center justify-between p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <div className="text-[10px] bg-slate-900/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 font-mono">
                      Crown Line
                    </div>
                    {/* Eye line */}
                    <div className="w-full border-t border-dashed border-cyan-400/50 flex justify-between px-2">
                      <span className="text-[9px] text-cyan-300 font-mono -mt-4">Eye Level</span>
                    </div>
                    <div className="text-[10px] bg-slate-900/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 font-mono">
                      Chin Line
                    </div>
                  </div>
                  <div className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full mt-3 backdrop-blur-sm">
                    Keep face straight and centered inside the oval
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[75%] h-[65%] border-2 border-dashed border-emerald-400/80 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="text-xs text-emerald-300 bg-slate-900/80 px-3 py-1 rounded-md border border-emerald-500/40">
                      Align document edges within this frame
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-xs text-slate-300">
              Initializing Camera...
            </div>
          )}
        </div>

        {/* Modal Controls Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {/* Camera device switcher */}
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={!!capturedImage || devices.length === 0}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {capturedImage ? (
              <>
                <button
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use Photo</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSnap}
                disabled={!stream || !!error}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/40 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Snapshot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
