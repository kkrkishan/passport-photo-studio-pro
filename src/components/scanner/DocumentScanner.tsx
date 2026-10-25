import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  FileText,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Crop,
  CheckCircle2,
  Trash2,
  Layout,
  Plus,
  FileDown,
  Check
} from 'lucide-react';
import {
  DocumentSlotState,
  DocumentSet,
  DocumentType,
  DOCUMENT_PRESETS,
  DocumentCorners
} from '../../types';
import { CornerAdjuster } from './CornerAdjuster';
import { DocumentEnhancer } from './DocumentEnhancer';
import { A4SheetLayout } from './A4SheetLayout';
import { CameraModal } from '../common/CameraModal';
import { saveOrDownloadFile } from '../../services/exportHelper';

const createEmptySlot = (): DocumentSlotState => ({
  rawImage: null,
  fileName: null,
  corners: null,
  rectifiedImage: null,
  enhancedImage: null,
  filterMode: 'magic',
  adjustments: { brightness: 0, contrast: 0, sharpness: 20, exposure: 0 },
});

export const DocumentScanner: React.FC = () => {
  const [documentSets, setDocumentSets] = useState<DocumentSet[]>([
    {
      id: 'set_1',
      name: 'Person 1',
      front: createEmptySlot(),
      back: createEmptySlot(),
    },
  ]);
  const [activeSetId, setActiveSetId] = useState<string>('set_1');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('aadhaar');

  // Scanner workflow view mode: 'overview' | 'corners' | 'enhance' | 'a4'
  const [viewMode, setViewMode] = useState<'overview' | 'corners' | 'enhance' | 'a4'>('overview');
  const [activeSlotTarget, setActiveSlotTarget] = useState<'front' | 'back'>('front');

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSet = documentSets.find((s) => s.id === activeSetId) || documentSets[0];

  const updateActiveSlot = (slot: 'front' | 'back', partial: Partial<DocumentSlotState>) => {
    setDocumentSets((sets) =>
      sets.map((s) => {
        if (s.id !== activeSetId) return s;
        return {
          ...s,
          [slot]: { ...s[slot], ...partial },
        };
      })
    );
  };

  // Add new document set (e.g. Person 2)
  const handleAddSet = () => {
    const newId = `set_${Date.now()}`;
    const newSet: DocumentSet = {
      id: newId,
      name: `Person ${documentSets.length + 1}`,
      front: createEmptySlot(),
      back: createEmptySlot(),
    };
    setDocumentSets([...documentSets, newSet]);
    setActiveSetId(newId);
  };

  const handleDeleteSet = (id: string) => {
    if (documentSets.length <= 1) return;
    const remaining = documentSets.filter((s) => s.id !== id);
    setDocumentSets(remaining);
    setActiveSetId(remaining[0].id);
  };

  // Import file for specific slot
  const handleSlotOpenFile = async (slot: 'front' | 'back') => {
    setActiveSlotTarget(slot);
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      const res = await electronAPI.openImage();
      if (res && res.dataUrl) {
        updateActiveSlot(slot, {
          rawImage: res.dataUrl,
          fileName: res.name,
          corners: null,
          rectifiedImage: null,
          enhancedImage: null,
        });
        // Automatically open Corner Adjuster
        setViewMode('corners');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateActiveSlot(activeSlotTarget, {
            rawImage: ev.target.result as string,
            fileName: file.name,
            corners: null,
            rectifiedImage: null,
            enhancedImage: null,
          });
          setViewMode('corners');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera capture callback
  const handleCameraCapture = (dataUrl: string) => {
    updateActiveSlot(activeSlotTarget, {
      rawImage: dataUrl,
      fileName: 'Camera_Capture.jpg',
      corners: null,
      rectifiedImage: null,
      enhancedImage: null,
    });
    setViewMode('corners');
  };

  // Apply homography perspective warp
  const handleApplyWarp = (rectifiedCanvas: HTMLCanvasElement, corners: DocumentCorners) => {
    const rectifiedUrl = rectifiedCanvas.toDataURL('image/jpeg', 0.95);
    updateActiveSlot(activeSlotTarget, {
      rectifiedImage: rectifiedUrl,
      corners,
    });
    // Move to Enhance step
    setViewMode('enhance');
  };

  // Confirm Enhancement
  const handleConfirmEnhance = (enhancedDataUrl: string, filterMode: any, adjustments: any) => {
    updateActiveSlot(activeSlotTarget, {
      enhancedImage: enhancedDataUrl,
      filterMode,
      adjustments,
    });
    setViewMode('overview');
  };

  const [scannerToast, setScannerToast] = useState<string | null>(null);

  const handleSaveSlotImage = async (slot: 'front' | 'back', format: 'jpg' | 'png') => {
    const slotData = activeSet[slot];
    const dataUrl = slotData.enhancedImage || slotData.rectifiedImage || slotData.rawImage;
    if (!dataUrl) return;

    const defaultName = `${selectedDocType}_${slot.toUpperCase()}_300DPI.${format}`;
    const res = await saveOrDownloadFile({
      dataUrl,
      defaultName,
      format,
    });

    if (res.success) {
      setScannerToast(res.filePath ? `Saved: ${res.filePath}` : `Saved ${slot.toUpperCase()} as ${format.toUpperCase()}`);
      setTimeout(() => setScannerToast(null), 3500);
    } else if (!res.canceled) {
      setScannerToast(`Export failed: ${res.error || ''}`);
      setTimeout(() => setScannerToast(null), 3500);
    }
  };

  // Sub-view: Corner Adjuster
  if (viewMode === 'corners') {
    const slot = activeSet[activeSlotTarget];
    if (!slot.rawImage) {
      setViewMode('overview');
      return null;
    }
    const preset = DOCUMENT_PRESETS[selectedDocType];
    return (
      <CornerAdjuster
        imageSrc={slot.rawImage}
        initialCorners={slot.corners}
        targetAspect={preset.aspectRatio}
        onApplyWarp={handleApplyWarp}
        onCancel={() => setViewMode('overview')}
      />
    );
  }

  // Sub-view: Enhance
  if (viewMode === 'enhance') {
    const slot = activeSet[activeSlotTarget];
    const imageToEnhance = slot.rectifiedImage || slot.rawImage;
    if (!imageToEnhance) {
      setViewMode('overview');
      return null;
    }
    return (
      <DocumentEnhancer
        imageSrc={imageToEnhance}
        slotLabel={activeSlotTarget === 'front' ? 'FRONT SIDE' : 'BACK SIDE'}
        onConfirm={handleConfirmEnhance}
        onBackToCorner={() => setViewMode('corners')}
      />
    );
  }

  // Sub-view: A4 Sheet Layout
  if (viewMode === 'a4') {
    return (
      <A4SheetLayout
        documentSets={documentSets}
        activeSetId={activeSetId}
        onSelectSet={setActiveSetId}
        onAddSet={handleAddSet}
        onDeleteSet={handleDeleteSet}
        onBackToScanner={() => setViewMode('overview')}
      />
    );
  }

  // Main Slot Overview
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] select-none overflow-hidden text-slate-200">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        mode="document"
      />

      {/* Top Bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium">Document Type:</span>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {Object.values(DOCUMENT_PRESETS).map((p) => (
                <option key={p.type} value={p.type}>
                  {p.title} ({p.widthMm} × {p.heightMm} mm)
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 border-r border-slate-700" />

          <div className="text-xs text-slate-400">
            Current Set: <span className="font-semibold text-emerald-400">{activeSet.name}</span>
          </div>
        </div>

        {/* Action: Create A4 Sheet button */}
        <button
          onClick={() => setViewMode('a4')}
          className="flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition"
        >
          <Layout className="w-4 h-4" />
          <span>CREATE A4 SHEET (FRONT + BACK)</span>
        </button>
      </div>

      {/* Dual Slot Cards Workspace */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-2 gap-8">
          {/* FRONT SIDE SLOT CARD */}
          <SlotCard
            label="FRONT SIDE"
            slotData={activeSet.front}
            onOpen={() => handleSlotOpenFile('front')}
            onCapture={() => {
              setActiveSlotTarget('front');
              setIsCameraOpen(true);
            }}
            onEditCorners={() => {
              setActiveSlotTarget('front');
              setViewMode('corners');
            }}
            onEnhance={() => {
              setActiveSlotTarget('front');
              setViewMode('enhance');
            }}
            onSave={(fmt) => handleSaveSlotImage('front', fmt)}
            onClear={() => updateActiveSlot('front', createEmptySlot())}
          />

          {/* BACK SIDE SLOT CARD */}
          <SlotCard
            label="BACK SIDE"
            slotData={activeSet.back}
            onOpen={() => handleSlotOpenFile('back')}
            onCapture={() => {
              setActiveSlotTarget('back');
              setIsCameraOpen(true);
            }}
            onEditCorners={() => {
              setActiveSlotTarget('back');
              setViewMode('corners');
            }}
            onEnhance={() => {
              setActiveSlotTarget('back');
              setViewMode('enhance');
            }}
            onSave={(fmt) => handleSaveSlotImage('back', fmt)}
            onClear={() => updateActiveSlot('back', createEmptySlot())}
          />
        </div>

        {/* Quick Instructions Bottom Card */}
        <div className="mt-8 max-w-4xl w-full p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>
              Upload or snap photos of your card. Our 4-point perspective engine will automatically straighten skewed camera angles into a crisp flat card.
            </span>
          </div>
          <button
            onClick={() => setViewMode('a4')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
          >
            <span>Preview A4 Layout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Scanner Toast */}
      {scannerToast && (
        <div className="absolute top-16 right-8 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{scannerToast}</span>
        </div>
      )}
    </div>
  );
};

interface SlotCardProps {
  label: string;
  slotData: DocumentSlotState;
  onOpen: () => void;
  onCapture: () => void;
  onEditCorners: () => void;
  onEnhance: () => void;
  onSave?: (format: 'jpg' | 'png') => void;
  onClear: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({
  label,
  slotData,
  onOpen,
  onCapture,
  onEditCorners,
  onEnhance,
  onSave,
  onClear,
}) => {
  const displayImage = slotData.enhancedImage || slotData.rectifiedImage || slotData.rawImage;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-[420px] transition hover:border-slate-700">
      {/* Slot Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
            {label}
          </span>
          {displayImage && (
            <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready for Print</span>
            </span>
          )}
        </div>
        {displayImage && (
          <button
            onClick={onClear}
            className="p-1 text-slate-500 hover:text-rose-400 transition"
            title="Remove Photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Preview / Empty Box */}
      <div className="flex-1 my-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 flex items-center justify-center overflow-hidden relative group">
        {displayImage ? (
          <img
            src={displayImage}
            alt={label}
            className="w-full h-full object-contain p-2 rounded-xl"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-slate-300">No {label} Loaded</div>
            <div className="text-[11px] text-slate-500 max-w-xs">
              Upload from computer or capture directly from desktop camera
            </div>
          </div>
        )}
      </div>

      {/* Slot Action Buttons */}
      <div className="pt-2 space-y-2">
        {displayImage ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onEditCorners}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
              >
                <Crop className="w-3.5 h-3.5 text-cyan-400" />
                <span>Adjust Corners</span>
              </button>
              <button
                onClick={onEnhance}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enhance Filters</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSave?.('jpg')}
                className="py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-slate-600 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                title="Save Single Card as JPG"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>Save JPG</span>
              </button>
              <button
                onClick={() => onSave?.('png')}
                className="py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-slate-600 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                title="Save Single Card as PNG"
              >
                <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save PNG</span>
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onOpen}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Upload Photo</span>
            </button>
            <button
              onClick={onCapture}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam Capture</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
