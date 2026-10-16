import React, { useState, useEffect } from 'react';
import type { InspectionReport } from '../types/inspection';
import { generateA4PDF, downloadA4PDF } from '../services/pdfGenerator';
import { formatBytes } from '../utils/imageCompressor';
import {
  Download,
  Printer,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Eye
} from 'lucide-react';

interface Props {
  report: InspectionReport;
  onClose: () => void;
}

export const PDFPreviewModal: React.FC<Props> = ({ report, onClose }) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'sheet' | 'raw'>('sheet');

  useEffect(() => {
    let activeUrl: string | null = null;

    generateA4PDF(report)
      .then((blob) => {
        setPdfBlob(blob);
        activeUrl = URL.createObjectURL(blob);
        setPdfUrl(activeUrl);
      })
      .catch((err) => {
        console.error('Failed to generate A4 PDF preview blob:', err);
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

  const handleOpenExternal = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
        return;
      }
    }
    window.print();
  };

  // Metrics
  const totalPhotos = report.areas.reduce((acc, a) => acc + (a.photos?.length || 0), 0);
  const cleanCount = report.areas.filter((a) => a.overallCondition === 'clean').length;
  const fairCount = report.areas.filter((a) => a.overallCondition === 'fair').length;
  const damagedCount = report.areas.filter((a) => a.overallCondition === 'damaged').length;
  const isRoutine = report.inspectionType === 'routine';

  // Collect all photos with area name
  const allPhotos = report.areas.flatMap((area) =>
    (area.photos || []).map((p) => ({ ...p, areaName: area.name }))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            <div className="icon-badge-accent">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="modal-title">A4 Inspection Report Preview</h3>
              <p className="modal-subtitle">
                {report.propertyAddress || 'Untitled Property'} • {report.inspectionDate}
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

            {/* Toggle between interactive Sheet and Raw Iframe */}
            <div className="preview-mode-toggle hidden sm:flex">
              <button
                type="button"
                onClick={() => setViewMode('sheet')}
                className={`toggle-tab-btn ${viewMode === 'sheet' ? 'active' : ''}`}
              >
                <Eye size={12} />
                <span>A4 Document Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`toggle-tab-btn ${viewMode === 'raw' ? 'active' : ''}`}
              >
                <span>Raw PDF View</span>
              </button>
            </div>
          </div>

          <div className="preview-buttons">
            <button
              type="button"
              onClick={handleOpenExternal}
              disabled={!pdfUrl}
              className="btn-secondary btn-sm flex-center gap-xs"
              title="Open full PDF file in a new tab"
            >
              <ExternalLink size={14} />
              <span className="hidden md:inline">Open in Tab</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary btn-sm flex-center gap-xs"
              title="Print document"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary btn-sm flex-center gap-xs"
              title="Download compiled A4 PDF file"
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
          {viewMode === 'raw' && pdfUrl ? (
            /* Desktop Fallback Raw Iframe */
            <iframe
              src={pdfUrl}
              title="A4 PDF Preview"
              className="preview-iframe"
            />
          ) : (
            /* Universal A4 Document Sheet View (100% Reliable on iPhone, Android, Tablet & Desktop) */
            <div className="a4-sheets-scroll-container">
              {/* ==============================================================
                  SHEET 1: COVER & EXECUTIVE SUMMARY
                  ============================================================== */}
              <div className="a4-sheet">
                <div className="a4-page-header">
                  <span>{report.propertyAddress || 'Property Inspection Report'}</span>
                  <span>{report.inspectionDate}</span>
                </div>

                {/* Banner */}
                <div className="a4-cover-banner">
                  <div>
                    <h1 className="a4-banner-title">PROPERTY CONDITION REPORT</h1>
                    <p className="a4-banner-sub">
                      {report.inspectionType.toUpperCase().replace('-', ' ')} INSPECTION •{' '}
                      {report.inspectorCompany || 'InspectA4 Official'}
                    </p>
                  </div>
                  <span className="a4-certified-badge">CERTIFIED A4</span>
                </div>

                {/* Details Section */}
                <div className="a4-card mb-md">
                  <h4 className="a4-section-title">1. PROPERTY &amp; INSPECTION DETAILS</h4>
                  <div className="a4-grid-2">
                    <div className="a4-kv-table">
                      <div className="a4-kv-row">
                        <span className="a4-k">Property Address:</span>
                        <span className="a4-v font-bold">{report.propertyAddress || 'N/A'}</span>
                      </div>
                      <div className="a4-kv-row">
                        <span className="a4-k">Inspection Date:</span>
                        <span className="a4-v">{report.inspectionDate || 'N/A'}</span>
                      </div>
                      <div className="a4-kv-row">
                        <span className="a4-k">Tenant / Client:</span>
                        <span className="a4-v">{report.tenantName || 'N/A'}</span>
                      </div>
                      <div className="a4-kv-row">
                        <span className="a4-k">Landlord / Agency:</span>
                        <span className="a4-v">{report.landlordName || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="a4-kv-table">
                      <div className="a4-kv-row">
                        <span className="a4-k">Lead Inspector:</span>
                        <span className="a4-v font-bold">{report.inspectorName || 'N/A'}</span>
                      </div>
                      <div className="a4-kv-row">
                        <span className="a4-k">Inspector Phone:</span>
                        <span className="a4-v">{report.inspectorPhone || 'N/A'}</span>
                      </div>
                      <div className="a4-kv-row">
                        <span className="a4-k">Inspector Email:</span>
                        <span className="a4-v">{report.inspectorEmail || 'N/A'}</span>
                      </div>
                      {/* Omit Keys Handover for Routine Inspections */}
                      {!isRoutine ? (
                        <div className="a4-kv-row">
                          <span className="a4-k">Keys Handover:</span>
                          <span className="a4-v font-bold">
                            {report.keysHandover?.keysProvided || 0} Keys /{' '}
                            {report.keysHandover?.remotesProvided || 0} Remotes
                          </span>
                        </div>
                      ) : (
                        <div className="a4-kv-row">
                          <span className="a4-k">Inspection Nature:</span>
                          <span className="a4-v font-bold text-sky-700">Periodic Tenancy Routine</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="a4-card mb-md">
                  <h4 className="a4-section-title">2. EXECUTIVE SUMMARY &amp; OVERALL CONDITION</h4>
                  <p className="a4-text-body">
                    {report.generalSummary ||
                      'All inspected rooms and fixtures were recorded in detail with photos and condition ratings below.'}
                  </p>
                </div>

                {/* Stat Pills */}
                <div className="a4-stats-row mb-md">
                  <div className="a4-stat-pill clean">
                    <span className="a4-stat-num">{cleanCount}</span>
                    <span className="a4-stat-lbl">Clean / Undamaged</span>
                  </div>
                  <div className="a4-stat-pill fair">
                    <span className="a4-stat-num">{fairCount}</span>
                    <span className="a4-stat-lbl">Fair / Minor Wear</span>
                  </div>
                  <div className="a4-stat-pill damaged">
                    <span className="a4-stat-num">{damagedCount}</span>
                    <span className="a4-stat-lbl">Action / Damaged</span>
                  </div>
                  <div className="a4-stat-pill photos">
                    <span className="a4-stat-num">{totalPhotos}</span>
                    <span className="a4-stat-lbl">Evidence Photos</span>
                  </div>
                </div>

                {/* Inspected Areas Overview Table */}
                <h4 className="a4-section-title mb-xs">3. INSPECTED AREAS OVERVIEW</h4>
                <table className="a4-table mb-md">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Area / Room</th>
                      <th style={{ width: '25%' }}>Condition Rating</th>
                      <th style={{ width: '20%' }}>Checklist Items</th>
                      <th style={{ width: '15%' }}>Photos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.areas.map((area, idx) => (
                      <tr key={area.id} className={idx % 2 === 1 ? 'even' : ''}>
                        <td className="font-bold">{area.name}</td>
                        <td>
                          <span className={`a4-rating-tag ${area.overallCondition}`}>
                            {area.overallCondition.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-muted">{area.items.length} checks</td>
                        <td className="text-muted">{area.photos?.length || 0} photos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="a4-page-footer">
                  <span>InspectA4 Certified Inspection Report • Smart-Compressed</span>
                  <span>Page 1</span>
                </div>
              </div>

              {/* ==============================================================
                  SHEET 2: DETAILED ROOM CHECKLISTS
                  ============================================================== */}
              <div className="a4-sheet">
                <div className="a4-page-header">
                  <span>{report.propertyAddress || 'Property Inspection Report'}</span>
                  <span>Detailed Checklists</span>
                </div>

                <h3 className="a4-sheet-h3">4. DETAILED FIXTURE &amp; ROOM CHECKLISTS</h3>

                <div className="space-y-md">
                  {report.areas.map((area) => (
                    <div key={area.id} className="a4-room-block">
                      <div className="a4-room-header">
                        <span className="font-bold text-slate-900">Area: {area.name}</span>
                        <span className={`a4-rating-tag ${area.overallCondition}`}>
                          {area.overallCondition.toUpperCase()}
                        </span>
                      </div>

                      <table className="a4-subtable">
                        <tbody>
                          {area.items.map((item) => (
                            <tr key={item.id}>
                              <td style={{ width: '40%' }}>• {item.name}</td>
                              <td style={{ width: '20%' }}>
                                <span className={`a4-mini-tag ${item.condition}`}>
                                  {item.condition === 'clean'
                                    ? 'Clean'
                                    : item.condition === 'fair'
                                    ? 'Fair'
                                    : item.condition === 'damaged'
                                    ? 'Damaged'
                                    : 'N/A'}
                                </span>
                              </td>
                              <td style={{ width: '40%' }} className="text-muted text-xs">
                                {item.comment || 'No defect noted'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {area.notes && (
                        <p className="a4-room-notes italic text-xs text-muted">
                          Notes: {area.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="a4-page-footer">
                  <span>InspectA4 Certified Inspection Report • Room Checklist</span>
                  <span>Page 2</span>
                </div>
              </div>

              {/* ==============================================================
                  SHEET 3+: HIGH-RESOLUTION EVIDENCE PHOTOS (TRUE ASPECT RATIOS!)
                  ============================================================== */}
              {allPhotos.length > 0 && (
                <div className="a4-sheet">
                  <div className="a4-page-header">
                    <span>{report.propertyAddress || 'Property Inspection Report'}</span>
                    <span>Photo Evidence Appendix</span>
                  </div>

                  <h3 className="a4-sheet-h3">5. HIGH-RESOLUTION PHOTO EVIDENCE APPENDIX</h3>
                  <p className="text-xs text-muted mb-md">
                    Total Evidence Photos: {allPhotos.length} (Rendered in true original proportions, optimized for A4 print)
                  </p>

                  <div className="a4-photo-appendix-grid">
                    {allPhotos.map((photo, pIdx) => {
                      const sizeKb = Math.round(photo.compressedSize / 1024);
                      return (
                        <div key={photo.id || pIdx} className="a4-photo-evidence-card">
                          {/* Image box respecting true original aspect ratio without distortion */}
                          <div className="a4-evidence-img-box">
                            <img
                              src={photo.dataUrl}
                              alt={photo.caption || 'Evidence'}
                              className="a4-evidence-img"
                            />
                          </div>

                          <div className="a4-photo-card-caption-row">
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {photo.areaName}
                              </div>
                              <p className="text-xs text-slate-500 mt-2xs">
                                {photo.caption || 'Inspection photographic record'}
                              </p>
                            </div>
                            <div className="text-right text-[10px] text-sky-700 font-semibold whitespace-nowrap">
                              {new Date(photo.takenAt).toLocaleDateString()} • {sizeKb} KB
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="a4-page-footer">
                    <span>InspectA4 Certified Inspection Report • Evidence Appendix</span>
                    <span>Photo Appendix</span>
                  </div>
                </div>
              )}

              {/* ==============================================================
                  FINAL SHEET: SIGNATURES & DECLARATIONS
                  ============================================================== */}
              <div className="a4-sheet">
                <div className="a4-page-header">
                  <span>{report.propertyAddress || 'Property Inspection Report'}</span>
                  <span>Signatures &amp; Handover</span>
                </div>

                <h3 className="a4-sheet-h3">6. DECLARATIONS &amp; DIGITAL SIGNATURES</h3>
                <p className="text-xs text-slate-600 mb-lg leading-relaxed">
                  By signing below, the inspector certifies that this property condition inspection was
                  conducted objectively and reflects the true condition of the premises on the date indicated.
                  The client/tenant acknowledges receipt of this report and all included photographic evidence.
                </p>

                <div className="a4-grid-2 mb-lg">
                  {/* Inspector Sign Box */}
                  <div className="a4-sig-box">
                    <h5 className="font-bold text-xs text-slate-900 mb-xs">Inspector Sign-Off</h5>
                    <div className="a4-sig-preview-area">
                      {report.signatures?.inspector?.signatureData ? (
                        <img
                          src={report.signatures.inspector.signatureData}
                          alt="Inspector Signature"
                          className="a4-sig-img"
                        />
                      ) : (
                        <span className="italic text-xs text-muted">(Signature on file)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-800 mt-xs">
                      <div><strong>Name:</strong> {report.signatures?.inspector?.name || report.inspectorName || 'Inspector'}</div>
                      <div><strong>Date:</strong> {report.signatures?.inspector?.date || report.inspectionDate}</div>
                    </div>
                  </div>

                  {/* Tenant Sign Box */}
                  <div className="a4-sig-box">
                    <h5 className="font-bold text-xs text-slate-900 mb-xs">Tenant / Client Acknowledgement</h5>
                    <div className="a4-sig-preview-area">
                      {report.signatures?.tenant?.signatureData ? (
                        <img
                          src={report.signatures.tenant.signatureData}
                          alt="Tenant Signature"
                          className="a4-sig-img"
                        />
                      ) : (
                        <span className="italic text-xs text-muted">(Acknowledgement pending)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-800 mt-xs">
                      <div><strong>Name:</strong> {report.signatures?.tenant?.name || report.tenantName || 'Tenant'}</div>
                      <div><strong>Date:</strong> {report.signatures?.tenant?.date || report.inspectionDate}</div>
                    </div>
                  </div>
                </div>

                <div className="a4-page-footer">
                  <span>InspectA4 Certified Inspection Report • Declarations</span>
                  <span>Final Page</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
