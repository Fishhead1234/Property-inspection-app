import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, Trash2, FolderOpen, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface Props {
  areaName: string;
  onSave: (dataUrls: string[]) => void;
  onClose: () => void;
}

export const MultiShotCameraModal: React.FC<Props> = ({ areaName, onSave, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [stagedPhotos, setStagedPhotos] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Start live back camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 }
          },
          audio: false
        });

        activeStream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((err) => console.log('Autoplay play error:', err));
        }
      } catch (err: unknown) {
        console.warn('Could not start live camera stream:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setCameraError(
          errMsg.includes('Permission') || errMsg.includes('NotAllowed')
            ? 'Camera permission denied. Please allow camera access in browser settings, or select photos from your device library below.'
            : 'Live camera stream not supported on this browser. You can select multiple photos from files or your folder below.'
        );
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Shutter action to take a live photo
  const handleCapture = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    // Haptic feedback if available on mobile
    if (typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(40);
      } catch (e) {
        // Ignore vibration errors
      }
    }

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1600;
      const height = video.videoHeight || 1200;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setStagedPhotos((prev) => [...prev, dataUrl]);
      }
    } catch (err) {
      console.error('Frame capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Import files into current multi-shot queue
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|avif|bmp|gif|heic|heif)$/i.test(f.name)
    );

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setStagedPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveStaged = (index: number) => {
    setStagedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (stagedPhotos.length > 0) {
      onSave(stagedPhotos);
    }
    onClose();
  };

  return (
    <div className="camera-modal-backdrop">
      <div className="camera-modal-shell">
        {/* Header */}
        <div className="camera-header-bar">
          <div className="flex items-center gap-xs">
            <span className="camera-live-dot" />
            <div>
              <h3 className="camera-title">Multi-Shot Camera</h3>
              <p className="camera-subtitle">{areaName}</p>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            <span className="camera-counter-badge">
              {stagedPhotos.length} {stagedPhotos.length === 1 ? 'Shot' : 'Shots'} Taken
            </span>
            <button
              type="button"
              onClick={onClose}
              className="camera-close-btn"
              title="Close camera"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder Video Frame */}
        <div className="camera-viewfinder-box">
          {cameraError ? (
            <div className="camera-fallback-card">
              <AlertCircle size={36} className="text-amber-400 mb-sm" />
              <h4 className="text-sm font-bold text-white mb-xs">Camera Unavailable</h4>
              <p className="text-xs text-muted mb-md max-w-sm">{cameraError}</p>

              <div className="flex-center gap-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary btn-sm flex-center gap-xs"
                >
                  <ImageIcon size={15} />
                  <span>Select Multiple Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="btn-secondary btn-sm flex-center gap-xs"
                >
                  <FolderOpen size={15} />
                  <span>Import from Folder</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-stream"
              />
              {flash && <div className="camera-flash-overlay" />}
            </>
          )}

          {/* Staged Thumbnails Strip */}
          {stagedPhotos.length > 0 && (
            <div className="camera-thumbnails-strip">
              {stagedPhotos.map((photoUrl, idx) => (
                <div key={idx} className="camera-thumbnail-item">
                  <img src={photoUrl} alt={`Shot ${idx + 1}`} className="camera-thumb-img" />
                  <button
                    type="button"
                    onClick={() => handleRemoveStaged(idx)}
                    className="camera-thumb-delete"
                    title="Remove this shot"
                  >
                    <Trash2 size={11} />
                  </button>
                  <span className="camera-thumb-num">#{idx + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Shutter & Action Controls */}
        <div className="camera-controls-bar">
          {/* Hidden inputs for adding from gallery or folder during multi-shot */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard for folder upload
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFiles}
            className="hidden"
          />

          <div className="camera-extra-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="camera-tool-btn"
              title="Add photos from file library"
            >
              <ImageIcon size={18} />
              <span>Library</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="camera-tool-btn"
              title="Add photos from a folder"
            >
              <FolderOpen size={18} />
              <span>Folder</span>
            </button>
          </div>

          {/* Big Center Shutter Button */}
          {!cameraError && (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing}
              className="camera-shutter-btn"
              aria-label="Take Photo"
              title="Snap photo"
            >
              <div className="camera-shutter-inner">
                <Camera size={26} className="text-slate-900" />
              </div>
            </button>
          )}

          {/* Finish & Commit Button */}
          <div className="camera-commit-actions">
            <button
              type="button"
              onClick={handleFinish}
              disabled={stagedPhotos.length === 0}
              className={`camera-done-btn ${stagedPhotos.length > 0 ? 'active' : ''}`}
            >
              <Check size={18} className="stroke-[2.5]" />
              <span>
                {stagedPhotos.length > 0
                  ? `Done (${stagedPhotos.length})`
                  : 'Add Photos'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiShotCameraModal;
