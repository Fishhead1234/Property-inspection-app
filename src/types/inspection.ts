export type InspectionType = 'move-in' | 'move-out' | 'routine' | 'pre-purchase';

export type ConditionRating = 'clean' | 'fair' | 'damaged' | 'na';

export interface InspectionPhoto {
  id: string;
  dataUrl: string; // Base64 compressed image (1600px max, JPEG 0.83 quality)
  caption: string;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  width: number;
  height: number;
  takenAt: string; // ISO date
}

export interface RoomItem {
  id: string;
  name: string;
  condition: ConditionRating;
  comment: string;
}

export interface InspectionArea {
  id: string;
  name: string;
  overallCondition: ConditionRating;
  notes: string;
  items: RoomItem[];
  photos: InspectionPhoto[];
}

export interface InspectionSignatures {
  inspector?: {
    name: string;
    signatureData: string; // Base64 PNG
    date: string;
  };
  tenant?: {
    name: string;
    signatureData: string; // Base64 PNG
    date: string;
  };
}

export interface KeysHandover {
  keysProvided: number;
  remotesProvided: number;
  notes: string;
}

export interface InspectionReport {
  id: string;
  title: string;
  propertyAddress: string;
  inspectionDate: string;
  inspectionType: InspectionType;
  inspectorName: string;
  inspectorCompany: string;
  inspectorEmail: string;
  inspectorPhone: string;
  tenantName: string;
  landlordName: string;
  generalSummary: string;
  areas: InspectionArea[];
  signatures: InspectionSignatures;
  keysHandover: KeysHandover;
  createdAt: string;
  updatedAt: string;
}

export interface CompressionStats {
  originalBytes: number;
  compressedBytes: number;
  savingsPercentage: number;
}
