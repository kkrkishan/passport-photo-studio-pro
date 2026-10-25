export type ActiveModule = 'dashboard' | 'passport' | 'scanner';

export interface PhotoPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  country?: string;
}

export const OFFICIAL_PASSPORT_PRESETS: PhotoPreset[] = [
  { id: 'in_35x45', name: '35 × 45 mm', widthMm: 35, heightMm: 45, description: 'India Passport, Schengen Visa, UK, Singapore, Australia', country: 'Multi' },
  { id: 'us_2x2', name: '2 × 2 inch (51 × 51 mm)', widthMm: 50.8, heightMm: 50.8, description: 'US Visa/Passport, India OCI, Pan Card Visa', country: 'US/India' },
  { id: 'size_30x40', name: '30 × 40 mm', widthMm: 30, heightMm: 40, description: 'Standard ID Card, Driving Licence, Corporate ID', country: 'Global' },
  { id: 'size_51x51', name: '51 × 51 mm', widthMm: 51, heightMm: 51, description: 'Square Visa / Biometric Specification', country: 'Multi' },
  { id: 'custom', name: 'Custom Size', widthMm: 35, heightMm: 45, description: 'User-specified dimensions', country: 'Custom' }
];

export interface SheetPaperPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const PAPER_PRESETS: SheetPaperPreset[] = [
  { id: '4x6', name: '4 × 6 inch (102 × 152 mm)', widthMm: 101.6, heightMm: 152.4, description: 'Standard Photo Paper (Ideal for 8 Passport Photos)' },
  { id: '5x7', name: '5 × 7 inch (127 × 178 mm)', widthMm: 127.0, heightMm: 177.8, description: 'Medium Photo Paper (Ideal for 12-15 Photos)' },
  { id: 'a4', name: 'A4 (210 × 297 mm)', widthMm: 210.0, heightMm: 297.0, description: 'Standard Office Paper / Bulk Print (Up to 45+ Photos)' },
  { id: 'a5', name: 'A5 (148 × 210 mm)', widthMm: 148.0, heightMm: 210.0, description: 'Half A4 Paper Sheet' },
  { id: 'letter', name: 'Letter (8.5 × 11 inch)', widthMm: 215.9, heightMm: 279.4, description: 'US Letter Standard Paper' },
  { id: 'custom', name: 'Custom Size', widthMm: 101.6, heightMm: 152.4, description: 'Custom Dimensions' }
];

export interface Adjustments {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  exposure: number;    // -100 to 100
  sharpness: number;   // 0 to 100
  highlights: number;  // -100 to 100
  shadows: number;     // -100 to 100
  temperature: number; // -100 (cool) to 100 (warm)
  rotation: number;    // -180 to 180 degrees
  flipH: boolean;
  flipV: boolean;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  sharpness: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
};

export interface BackgroundSettings {
  enabled: boolean;
  color: string; // hex
  tolerance: number; // 0 to 100
  feather: number;   // 0 to 20
}

export interface SheetConfig {
  paperId: string;
  customWidthMm: number;
  customHeightMm: number;
  orientation: 'portrait' | 'landscape' | 'auto';
  marginMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  copies: number;
  showBorders: boolean;
  borderColor: string;
  borderWidthPx: number;
  showCutLines: boolean;
  cutLineStyle: 'cross' | 'dashed' | 'solid';
  dpi: 300 | 600;
  centerAlign: boolean;
}

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  paperId: '4x6',
  customWidthMm: 101.6,
  customHeightMm: 152.4,
  orientation: 'auto',
  marginMm: 3,
  gapHorizontalMm: 2,
  gapVerticalMm: 2,
  copies: 8,
  showBorders: true,
  borderColor: '#cccccc',
  borderWidthPx: 1,
  showCutLines: true,
  cutLineStyle: 'cross',
  dpi: 300,
  centerAlign: true,
};

export interface Point2D {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export type DocumentType =
  | 'aadhaar'
  | 'jan_aadhaar'
  | 'driving_licence'
  | 'pan_card'
  | 'voter_id'
  | 'passport'
  | 'certificate'
  | 'other';

export interface DocumentPresetInfo {
  type: DocumentType;
  title: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
}

export const DOCUMENT_PRESETS: Record<DocumentType, DocumentPresetInfo> = {
  aadhaar: { type: 'aadhaar', title: 'Aadhaar Card', widthMm: 85.6, heightMm: 54.0, aspectRatio: 85.6 / 54.0 },
  pan_card: { type: 'pan_card', title: 'PAN Card', widthMm: 85.6, heightMm: 54.0, aspectRatio: 85.6 / 54.0 },
  driving_licence: { type: 'driving_licence', title: 'Driving Licence', widthMm: 85.6, heightMm: 54.0, aspectRatio: 85.6 / 54.0 },
  voter_id: { type: 'voter_id', title: 'Voter ID Card', widthMm: 85.6, heightMm: 54.0, aspectRatio: 85.6 / 54.0 },
  jan_aadhaar: { type: 'jan_aadhaar', title: 'Jan Aadhaar Card', widthMm: 110.0, heightMm: 70.0, aspectRatio: 110 / 70 },
  passport: { type: 'passport', title: 'Passport Page', widthMm: 125.0, heightMm: 88.0, aspectRatio: 125 / 88 },
  certificate: { type: 'certificate', title: 'A4 Certificate', widthMm: 210.0, heightMm: 297.0, aspectRatio: 210 / 297 },
  other: { type: 'other', title: 'Other Document', widthMm: 85.6, heightMm: 54.0, aspectRatio: 85.6 / 54.0 },
};

export interface DocumentSlotState {
  rawImage: string | null;       // Data URL
  fileName: string | null;
  corners: DocumentCorners | null;
  rectifiedImage: string | null; // Data URL after homography
  enhancedImage: string | null;  // Data URL after filters
  filterMode: 'original' | 'magic' | 'bw' | 'grayscale' | 'enhanced';
  adjustments: {
    brightness: number;
    contrast: number;
    sharpness: number;
    exposure: number;
  };
}

export interface A4LayoutSettings {
  documentType: DocumentType;
  targetWidthMm: number;
  targetHeightMm: number;
  arrangement: 'vertical' | 'horizontal'; // Front top + Back bottom OR Front left + Back right
  topMarginMm: number;
  sideMarginMm: number;
  gapMm: number;
  showCutLines: boolean;
  showBorders: boolean;
  showLabels: boolean; // "FRONT SIDE" / "BACK SIDE"
  dpi: 300 | 600;
}

export const DEFAULT_A4_LAYOUT: A4LayoutSettings = {
  documentType: 'aadhaar',
  targetWidthMm: 85.6,
  targetHeightMm: 54.0,
  arrangement: 'vertical',
  topMarginMm: 25,
  sideMarginMm: 20,
  gapMm: 20,
  showCutLines: true,
  showBorders: true,
  showLabels: true,
  dpi: 300,
};

export interface DocumentSet {
  id: string;
  name: string;
  front: DocumentSlotState;
  back: DocumentSlotState;
}

export interface PPSPProjectFile {
  version: '1.0';
  software: 'Passport Photo Studio Pro';
  createdAt: string;
  module: 'passport' | 'scanner';
  passportData?: {
    rawImage: string | null;
    cropPreset: PhotoPreset;
    cropArea: { x: number; y: number; width: number; height: number };
    adjustments: Adjustments;
    background: BackgroundSettings;
    sheetConfig: SheetConfig;
  };
  scannerData?: {
    documentSets: DocumentSet[];
    activeSetId: string;
    layoutSettings: A4LayoutSettings;
  };
}
