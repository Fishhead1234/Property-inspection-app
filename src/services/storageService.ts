import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { InspectionReport, InspectionArea } from '../types/inspection';

interface InspectionDB extends DBSchema {
  reports: {
    key: string;
    value: InspectionReport;
    indexes: { 'by-date': string };
  };
}

const DB_NAME = 'inspecta4_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<InspectionDB>> | null = null;

function getDB(): Promise<IDBPDatabase<InspectionDB>> {
  if (!dbPromise) {
    dbPromise = openDB<InspectionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('reports', { keyPath: 'id' });
        store.createIndex('by-date', 'inspectionDate');
      },
    });
  }
  return dbPromise;
}

export const STANDARD_ROOM_TEMPLATES: Array<{ name: string; items: string[] }> = [
  {
    name: 'Entrance & Hallway',
    items: ['Front Door, Locks & Keys', 'Flooring / Doormat', 'Walls & Skirting', 'Light Fitting & Switches']
  },
  {
    name: 'Living & Dining Room',
    items: ['Walls & Baseboards', 'Ceiling & Light Fittings', 'Windows & Blinds/Curtains', 'Power Outlets & Air Conditioning', 'Flooring / Carpet']
  },
  {
    name: 'Kitchen & Pantry',
    items: ['Oven, Cooktop & Grill', 'Rangehood & Filters', 'Benchtop & Splashback', 'Sink, Taps & Drainage', 'Cupboards, Drawers & Pantry', 'Dishwasher Interior']
  },
  {
    name: 'Master Bedroom',
    items: ['Door & Hardware', 'Built-in Wardrobe & Shelving', 'Windows & Window Coverings', 'Walls, Ceiling & Outlets', 'Carpet / Timber Floor']
  },
  {
    name: 'Bedroom 2',
    items: ['Door & Handle', 'Wardrobe & Mirrors', 'Window & Flyscreens', 'Walls, Ceiling & Floor']
  },
  {
    name: 'Main Bathroom & Toilet',
    items: ['Vanity, Basin & Mirror', 'Shower Recess, Screen & Rose', 'Bathtub & Sealant', 'Toilet Pan, Seat & Cistern', 'Exhaust Fan & Towel Rails']
  },
  {
    name: 'Laundry Area',
    items: ['Laundry Tub & Tapware', 'Washing Machine Connections', 'Floor Tiling & Waste Drain', 'Dryer Exhaust Space']
  },
  {
    name: 'Balcony / Patio / Yard',
    items: ['Balcony Tiles / Decking', 'Balustrade & Railings', 'Sliding Doors & Flyscreens', 'External Lighting & Tap']
  },
  {
    name: 'Garage & Parking',
    items: ['Garage Roller Door & Remote', 'Floor / Oil Stains Check', 'Light & Power Point', 'Storage Area']
  }
];

export function createDefaultNewReport(): InspectionReport {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const defaultAreas: InspectionArea[] = STANDARD_ROOM_TEMPLATES.map((tmpl, idx) => ({
    id: 'area_' + (idx + 1) + '_' + Math.random().toString(36).substring(2, 6),
    name: tmpl.name,
    overallCondition: 'clean',
    notes: '',
    items: tmpl.items.map((itemName, itemIdx) => ({
      id: 'item_' + (idx + 1) + '_' + (itemIdx + 1),
      name: itemName,
      condition: 'clean',
      comment: ''
    })),
    photos: []
  }));

  return {
    id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: 'Routine Inspection Report',
    propertyAddress: '',
    inspectionDate: dateStr,
    inspectionType: 'routine',
    inspectorName: 'Alex Mercer',
    inspectorCompany: 'Apex Property Management',
    inspectorEmail: 'alex.mercer@apexpm.com',
    inspectorPhone: '+1 (555) 234-8901',
    tenantName: '',
    landlordName: '',
    generalSummary: '',
    areas: defaultAreas,
    signatures: {
      inspector: {
        name: 'Alex Mercer',
        signatureData: '',
        date: dateStr
      }
    },
    keysHandover: {
      keysProvided: 0,
      remotesProvided: 0,
      notes: ''
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * Creates a demo sample inspection report with realistic test photos so the user can immediately
 * preview the A4 PDF without having to take 20 photos first.
 */
export function createSampleDemoReport(): InspectionReport {
  const report = createDefaultNewReport();
  report.title = 'Move-In Condition Report';
  report.inspectionType = 'move-in';
  report.propertyAddress = '74 Grandview Terrace, Sydney NSW 2000';
  report.inspectorName = 'Marcus Vance';
  report.inspectorCompany = 'Vance & Co. Property Care';
  report.tenantName = 'Elena Rostova';
  report.landlordName = 'Blue Harbor Assets Ltd';
  report.generalSummary = 'Move-in inspection conducted prior to tenancy commencement. All fixtures clean and operational. Key handover completed in full.';

  // Sample SVG placeholder images representing clean inspection photos
  const createSamplePhoto = (label: string, color: string, subtext: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)"/>
      <rect x="30" y="30" width="740" height="540" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="12"/>
      <circle cx="400" cy="240" r="60" fill="rgba(255,255,255,0.15)"/>
      <path d="M380 240 L400 215 L420 240 M400 215 L400 270" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
      <text x="400" y="350" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${label}</text>
      <text x="400" y="390" font-family="system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">${subtext}</text>
      <text x="400" y="440" font-family="system-ui, sans-serif" font-size="14" fill="#38BDF8" text-anchor="middle">Compressed: 182 KB (Original: 6.8 MB - 97.3% saved)</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  // Attach sample photos to kitchen and living room
  if (report.areas[0]) {
    report.areas[0].photos.push({
      id: 'photo_demo_1',
      dataUrl: createSamplePhoto('Main Entrance & Key Lockbox', '#1E3A8A', 'Key lock tested and working smoothly'),
      caption: 'Front security door and electronic keypad verified operational',
      originalSize: 7200000,
      compressedSize: 195000,
      width: 1600,
      height: 1200,
      takenAt: new Date().toISOString()
    });
  }

  if (report.areas[1]) {
    report.areas[1].photos.push({
      id: 'photo_demo_2',
      dataUrl: createSamplePhoto('Living Area Overview', '#065F46', 'Hardwood floor pristine condition'),
      caption: 'Living room timber flooring clean, no scratches or indentations',
      originalSize: 8400000,
      compressedSize: 215000,
      width: 1600,
      height: 1200,
      takenAt: new Date().toISOString()
    });
  }

  if (report.areas[2]) {
    report.areas[2].photos.push(
      {
        id: 'photo_demo_3',
        dataUrl: createSamplePhoto('Cooktop & Rangehood', '#831843', 'Stainless steel surfaces sanitized'),
        caption: 'Induction cooktop clean with zero glass chips, rangehood lights operational',
        originalSize: 6900000,
        compressedSize: 188000,
        width: 1600,
        height: 1200,
        takenAt: new Date().toISOString()
      },
      {
        id: 'photo_demo_4',
        dataUrl: createSamplePhoto('Under-Sink Plumbing Check', '#312E81', 'Dry, zero moisture or leaks detected'),
        caption: 'Under-sink waste pipes dry, water shut-off valves inspected',
        originalSize: 7600000,
        compressedSize: 202000,
        width: 1600,
        height: 1200,
        takenAt: new Date().toISOString()
      }
    );
  }

  return report;
}

export async function saveReport(report: InspectionReport): Promise<void> {
  const db = await getDB();
  report.updatedAt = new Date().toISOString();
  await db.put('reports', report);
}

export async function getReport(id: string): Promise<InspectionReport | undefined> {
  const db = await getDB();
  return db.get('reports', id);
}

export async function getAllReports(): Promise<InspectionReport[]> {
  const db = await getDB();
  return db.getAll('reports');
}

export async function deleteReport(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reports', id);
}
