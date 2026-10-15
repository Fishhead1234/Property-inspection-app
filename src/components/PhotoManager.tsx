import React, { useState, useRef } from 'react';
import type { InspectionPhoto } from '../types/inspection';
import { compressMultipleImages, formatBytes } from '../utils/imageCompressor';
import {
  Camera,
  Image as ImageIcon,
  FolderOpen,
  Trash2,
  Maximize2,
  X,
  Sparkles,
  UploadCloud
} from 'lucide-react';

interface Props {
  photos: InspectionPhoto[];
  areaName: string;
  onChange: (photos: InspectionPhoto[]) => void;
}

export const PhotoManager: React.FC<Props> = ({ photos, areaName, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<InspectionPhoto | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (fileList: File[]) => {
    // Filter only images (supports folders containing non-image files or hidden files)
    const imageFiles = fileList.filter(
      (file) =>
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|avif|bmp|gif|heic|heif)$/i.test(file.name)
    );

    if (imageFiles.length === 0) {
      alert('No valid image files found. Please select JPG, PNG, WEBP, or HEIC photos.');
      return;
    }

    setIsCompressing(true);
    setCompressProgress({ current: 0, total: imageFiles.length });

    try {
      const compressed = await compressMultipleImages(imageFiles, (curr, total) => {
        setCompressProgress({ current: curr, total });
      });

      onChange([...photos, ...compressed]);
    } catch (err) {
      console.error('Photo compression error:', err);
      alert('Error compressing photos. Please try again.');
    } finally {
      setIsCompressing(false);
      setCompressProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    const updated = photos.map((p) => (p.id === id ? { ...p, caption } : p));
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this inspection photo?')) {
      onChange(photos.filter((p) => p.id !== id));
    }
  };

  // Calculate total savings for this area
  const totalOriginal = photos.reduce((acc, p) => acc + p.originalSize, 0);
  const totalCompressed = photos.reduce((acc, p) => acc + p.compressedSize, 0);
  const totalSavings =
    totalOriginal > 0
      ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
      : 0;

  return (
    <div className="photo-manager">
      <div className="photo-manager-header">
        <div>
          <h4 className="photo-manager-title">Evidence Photos ({photos.length})</h4>
          <p className="photo-manager-desc">
            Smart-compressed for high A4 clarity (1600px) with automatic size optimization
          </p>
        </div>

        {photos.length > 0 && (
          <div className="compression-badge">
            <Sparkles size={13} className="text-accent" />
            <span>{formatBytes(totalCompressed)} ({totalSavings}% saved)</span>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      {/* 1. Camera Native Capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        id={`cam-${areaName}`}
      />

      {/* 2. Gallery / Multi-photo Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
        id={`file-${areaName}`}
      />

      {/* 3. Folder / Directory Picker */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in HTML5 for folder upload
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleInputChange}
        className="hidden"
        id={`folder-${areaName}`}
      />

      {/* Action Buttons: Take Photo, Select Photos, Load from Folder */}
      <div className="photo-actions-grid">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isCompressing}
          className="btn-primary photo-action-btn"
          title="Open camera to take photo on device"
        >
          <Camera size={16} className="stroke-[2.5]" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="btn-secondary photo-action-btn"
          title="Choose one or multiple photos from gallery or files"
        >
          <ImageIcon size={16} />
          <span>Select Photos</span>
        </button>

        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          disabled={isCompressing}
          className="btn-secondary photo-action-btn"
          title="Upload all photos directly from an entire folder"
        >
          <FolderOpen size={16} />
          <span>Load Folder</span>
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`photo-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud size={20} className="text-muted mb-2xs" />
        <p className="drop-zone-text">
          Drag &amp; drop photos or whole folders here, or use the buttons above
        </p>
      </div>

      {/* Compression Progress Bar */}
      {isCompressing && compressProgress && (
        <div className="compression-progress-card">
          <div className="flex-between text-xs font-semibold mb-xs">
            <span className="flex-center gap-xs text-accent">
              <Sparkles size={14} className="animate-spin" />
              <span>Compressing &amp; Optimizing High-Res Photos...</span>
            </span>
            <span>
              {compressProgress.current} / {compressProgress.total}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${(compressProgress.current / compressProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="empty-photos-box">
          <Camera size={26} className="text-muted mb-xs" />
          <p className="text-xs text-muted">No evidence photos added for {areaName} yet.</p>
        </div>
      ) : (
        <div className="photos-grid">
          {photos.map((photo) => {
            const savings =
              photo.originalSize > 0
                ? Math.round(
                    ((photo.originalSize - photo.compressedSize) / photo.originalSize) * 100
                  )
                : 0;

            return (
              <div key={photo.id} className="photo-card">
                <div className="photo-image-wrapper">
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || 'Evidence'}
                    className="photo-thumb"
                  />

                  {/* Floating Action Overlay */}
                  <div className="photo-overlay-actions">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      title="Inspect full resolution"
                      className="btn-icon-blur"
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id)}
                      title="Delete photo"
                      className="btn-icon-blur text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Savings Pill */}
                  <div className="photo-size-tag">
                    <span>{formatBytes(photo.compressedSize)}</span>
                    <span className="text-emerald-400 font-bold ml-1">(-{savings}%)</span>
                  </div>
                </div>

                <div className="photo-card-body">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                    placeholder="Photo caption (e.g. 'Scuff near skirt', 'Clean')"
                    className="photo-caption-input"
                  />
                  <div className="photo-meta-row">
                    <span className="photo-dim">
                      {photo.width}×{photo.height}px
                    </span>
                    <span className="photo-date">
                      {new Date(photo.takenAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div className="lightbox-backdrop" onClick={() => setPreviewPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div>
                <h3 className="lightbox-title">{areaName} Evidence</h3>
                <p className="lightbox-subtitle">
                  {previewPhoto.width}×{previewPhoto.height}px •{' '}
                  {formatBytes(previewPhoto.compressedSize)} (from{' '}
                  {formatBytes(previewPhoto.originalSize)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="btn-icon-circle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="lightbox-image-container">
              <img
                src={previewPhoto.dataUrl}
                alt="Full resolution inspection evidence"
                className="lightbox-full-img"
              />
            </div>

            {previewPhoto.caption && (
              <div className="lightbox-footer">
                <p className="text-sm text-slate-200">{previewPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoManager;
