import React, { useState, useEffect } from 'react';
import type { InspectionReport } from '../types/inspection';
import { generateA4PDF, downloadA4PDF } from '../services/pdfGenerator';
import { formatBytes } from '../utils/imageCompressor';
import { Download, Printer, X, FileText, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  report: InspectionReport;
  onClose: () => void;
}

export const PDFPreviewModal: React.FC<Props> = ({ report, onClose }) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    let activeUrl: string | null = null;
    setIsGenerating(true);

    generateA4PDF(report)
      .then((blob) => {
        setPdfBlob(blob);
        activeUrl = URL.createObjectURL(blob);
        setPdfUrl(activeUrl);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate A4 PDF preview:', err);
        setIsGenerating(false);
      });

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [report]);

  const handleDownload = async () => {
    try {
      await downloadA4PDF(report);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Could not download PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  const totalPhotos = report.areas.reduce((acc, a) => acc + (a.photos?.length || 0), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-center gap-sm">
            <div className="icon-badge-accent">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="modal-title">A4 Inspection Report Preview</h3>
              <p className="modal-subtitle">
                {report.propertyAddress} • {report.inspectionDate}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="btn-icon-circle">
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="preview-action-bar">
          <div className="preview-meta">
            {pdfBlob && (
              <span className="badge-pill bg-slate-800 text-slate-300">
                A4 Document • {formatBytes(pdfBlob.size)} • {totalPhotos} Evidence Photos
              </span>
            )}
            <span className="badge-pill bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <Sparkles size={11} className="mr-1 inline" /> Smart-Compressed
            </span>
          </div>

          <div className="preview-buttons">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || !pdfUrl}
              className="btn-secondary btn-sm flex-center gap-xs"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !pdfUrl}
              className="btn-primary btn-sm flex-center gap-xs"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download A4 PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Document Viewer Frame */}
        <div className="preview-viewer-box">
          {isGenerating ? (
            <div className="preview-loading">
              <Loader2 size={36} className="text-accent animate-spin mb-sm" />
              <p className="text-sm font-semibold text-slate-200">Rendering A4 Inspection Document...</p>
              <p className="text-xs text-muted mt-xs">Compiling checklist tables, photo appendix &amp; signatures</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="A4 PDF Preview"
              className="preview-iframe"
            />
          ) : (
            <div className="preview-error">
              <p className="text-danger font-semibold">Failed to render PDF preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
