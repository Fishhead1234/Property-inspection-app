import React, { useState, useRef } from 'react';
import type { InspectionPhoto } from '../types/inspection';
import { compressMultipleImages, formatBytes } from '../utils/imageCompressor';
import { Camera, Image as ImageIcon, Trash2, Maximize2, X, Sparkles } from 'lucide-react';

interface Props {
  photos: InspectionPhoto[];
  areaName: string;
  onChange: (photos: InspectionPhoto[]) => void;
}

export const PhotoManager: React.FC<Props> = ({ photos, areaName, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<InspectionPhoto | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    setCompressProgress({ current: 0, total: files.length });

    try {
      const fileList = Array.from(files);
      const compressed = await compressMultipleImages(fileList, (curr, total) => {
        setCompressProgress({ current: curr, total });
      });

      onChange([...photos, ...compressed]);
    } catch (err) {
      console.error('Photo compression error:', err);
      alert('Error compressing photo. Please try again.');
    } finally {
      setIsCompressing(false);
      setCompressProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    const updated = photos.map(p => p.id === id ? { ...p, caption } : p);
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this inspection photo?')) {
      onChange(photos.filter(p => p.id !== id));
    }
  };

  // Calculate total savings for this area
  const totalOriginal = photos.reduce((acc, p) => acc + p.originalSize, 0);
  const totalCompressed = photos.reduce((acc, p) => acc + p.compressedSize, 0);
  const totalSavings = totalOriginal > 0 ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100) : 0;

  return (
    <div className="photo-manager">
      <div className="photo-manager-header">
        <div>
          <h4 className="photo-manager-title">Evidence Photos ({photos.length})</h4>
          <p className="photo-manager-desc">
            Smart-compressed for high A4 clarity without bloating file size
          </p>
        </div>

        {photos.length > 0 && (
          <div className="compression-badge">
            <Sparkles size={13} className="text-accent" />
            <span>{formatBytes(totalCompressed)} ({totalSavings}% saved)</span>
          </div>
        )}
      </div>

      {/* Action Buttons: Camera & Gallery */}
      <div className="photo-actions-row">
        {/* Hidden Camera Input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFiles}
          className="hidden"
          id={`cam-${areaName}`}
        />
        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
          id={`file-${areaName}`}
        />

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isCompressing}
          className="btn-primary flex-1 flex-center gap-xs"
        >
          <Camera size={17} />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="btn-secondary flex-1 flex-center gap-xs"
        >
          <ImageIcon size={17} />
          <span>Upload Gallery</span>
        </button>
      </div>

      {/* Compression Progress Bar */}
      {isCompressing && compressProgress && (
        <div className="compression-progress-card">
          <div className="flex-between text-xs font-semibold mb-xs">
            <span className="flex-center gap-xs text-accent">
              <Sparkles size={14} className="animate-spin" />
              <span>Compressing &amp; Optimizing...</span>
            </span>
            <span>{compressProgress.current} / {compressProgress.total}</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${(compressProgress.current / compressProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="empty-photos-box">
          <Camera size={28} className="text-muted mb-xs" />
          <p className="text-xs text-muted">No evidence photos added for {areaName} yet.</p>
        </div>
      ) : (
        <div className="photos-grid">
          {photos.map((photo) => {
            const savings = photo.originalSize > 0 
              ? Math.round(((photo.originalSize - photo.compressedSize) / photo.originalSize) * 100) 
              : 0;

            return (
              <div key={photo.id} className="photo-card">
                <div className="photo-image-wrapper">
                  <img src={photo.dataUrl} alt={photo.caption || 'Evidence'} className="photo-thumb" />
                  
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
                    <span className="photo-dim">{photo.width}×{photo.height}px</span>
                    <span className="photo-date">{new Date(photo.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                  {previewPhoto.width}×{previewPhoto.height}px • {formatBytes(previewPhoto.compressedSize)} (from {formatBytes(previewPhoto.originalSize)})
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
