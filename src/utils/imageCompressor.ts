import type { InspectionPhoto } from '../types/inspection';

export interface CompressionOptions {
  maxDimension?: number; // e.g. 1600px
  quality?: number; // 0.83
  mimeType?: string; // 'image/jpeg'
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxDimension: 1600, // Sweet spot for A4 300DPI prints and retina mobile screens
  quality: 0.83, // Visually indistinguishable from uncompressed, ~95% size reduction
  mimeType: 'image/jpeg'
};

/**
 * Format bytes into human readable string (KB / MB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Keeps resolution large enough (1600px max) so photos stay razor sharp for inspection evidence,
 * while drastically slashing file sizes from ~10MB down to ~150-280KB.
 */
export async function compressImage(
  file: File,
  customOptions?: CompressionOptions
): Promise<InspectionPhoto> {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionally if larger than maxDimension
      const maxDim = options.maxDimension || 1600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to acquire canvas 2D rendering context'));
        return;
      }

      // High-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw background in case of transparent PNG converted to JPEG
      if (options.mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export compressed image as dataUrl
      const dataUrl = canvas.toDataURL(options.mimeType, options.quality);

      // Calculate compressed size from Base64 string
      // Base64 is roughly 4/3 of binary size minus padding
      const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
      const compressedSize = Math.round((stringLength * 3) / 4);

      resolve({
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        dataUrl,
        caption: '',
        originalSize,
        compressedSize,
        width,
        height,
        takenAt: new Date().toISOString()
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression: ' + err));
    };

    img.src = objectUrl;
  });
}

/**
 * Batch compress multiple files with progressive reporting
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (current: number, total: number) => void,
  options?: CompressionOptions
): Promise<InspectionPhoto[]> {
  const results: InspectionPhoto[] = [];
  for (let i = 0; i < files.length; i++) {
    const photo = await compressImage(files[i], options);
    results.push(photo);
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  return results;
}
