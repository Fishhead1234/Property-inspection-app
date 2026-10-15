import React, { useState, useEffect } from 'react';
import type { InspectionReport, InspectionArea, InspectionType } from './types/inspection';
import {
  createDefaultNewReport,
  createSampleDemoReport,
  saveReport,
  getAllReports
} from './services/storageService';
import { downloadA4PDF } from './services/pdfGenerator';
import { formatBytes } from './utils/imageCompressor';
import { AreaSection } from './components/AreaSection';
import { SignaturePad } from './components/SignaturePad';
import { PDFPreviewModal } from './components/PDFPreviewModal';
import {
  Home,
  CheckSquare,
  Camera,
  PenTool,
  Download,
  Eye,
  Plus,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';

export const App: React.FC = () => {
  const [report, setReport] = useState<InspectionReport>(createDefaultNewReport);
  const [activeTab, setActiveTab] = useState<'details' | 'areas' | 'photos' | 'signatures'>('details');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved locally');
  const [newAreaName, setNewAreaName] = useState('');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);

  // Load latest report or demo on initial mount
  useEffect(() => {
    getAllReports()
      .then((reports) => {
        if (reports.length > 0) {
          // Sort by updated descending
          const sorted = [...reports].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setReport(sorted[0]);
        } else {
          // Load default template and save
          const initial = createSampleDemoReport();
          setReport(initial);
          saveReport(initial);
        }
      })
      .catch((err) => {
        console.error('Error loading reports from IndexedDB:', err);
      });
  }, []);

  // Auto-save whenever report changes
  useEffect(() => {
    if (!report || !report.id) return;
    const timer = setTimeout(() => {
      saveReport(report)
        .then(() => {
          setSaveStatus(`Saved • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        })
        .catch((err) => console.error('Auto-save error:', err));
    }, 600);

    return () => clearTimeout(timer);
  }, [report]);

  const handleUpdateArea = (updatedArea: InspectionArea) => {
    const updatedAreas = report.areas.map((a) => (a.id === updatedArea.id ? updatedArea : a));
    setReport({ ...report, areas: updatedAreas });
  };

  const handleDeleteArea = (areaId: string) => {
    if (confirm('Are you sure you want to delete this room and all its checks/photos?')) {
      const updatedAreas = report.areas.filter((a) => a.id !== areaId);
      setReport({ ...report, areas: updatedAreas });
    }
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const newArea: InspectionArea = {
      id: 'custom_area_' + Date.now(),
      name: newAreaName.trim(),
      overallCondition: 'clean',
      notes: '',
      items: [
        { id: 'item_' + Date.now() + '_1', name: 'Walls & Skirting', condition: 'clean', comment: '' },
        { id: 'item_' + Date.now() + '_2', name: 'Doors & Windows', condition: 'clean', comment: '' },
        { id: 'item_' + Date.now() + '_3', name: 'Flooring', condition: 'clean', comment: '' },
        { id: 'item_' + Date.now() + '_4', name: 'Lighting & Power', condition: 'clean', comment: '' }
      ],
      photos: []
    };

    setReport({ ...report, areas: [...report.areas, newArea] });
    setNewAreaName('');
    setShowAddAreaModal(false);
  };

  const handleLoadDemo = () => {
    if (confirm('Load sample inspection report with realistic photos and ratings?')) {
      const demo = createSampleDemoReport();
      setReport(demo);
      saveReport(demo);
    }
  };

  const handleNewReport = () => {
    if (confirm('Start a brand new inspection report?')) {
      const fresh = createDefaultNewReport();
      setReport(fresh);
      saveReport(fresh);
      setActiveTab('details');
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await downloadA4PDF(report);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Error generating A4 PDF. Please check your photos and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Metrics
  const totalPhotos = report.areas.reduce((acc, a) => acc + (a.photos?.length || 0), 0);
  const totalOriginalBytes = report.areas.reduce(
    (acc, a) => acc + (a.photos?.reduce((pAcc, p) => pAcc + p.originalSize, 0) || 0),
    0
  );
  const totalCompressedBytes = report.areas.reduce(
    (acc, a) => acc + (a.photos?.reduce((pAcc, p) => pAcc + p.compressedSize, 0) || 0),
    0
  );
  const totalSavings =
    totalOriginalBytes > 0
      ? Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100)
      : 0;

  const totalChecks = report.areas.reduce((acc, a) => acc + a.items.length, 0);
  const cleanChecks = report.areas.reduce(
    (acc, a) => acc + a.items.filter((i) => i.condition === 'clean').length,
    0
  );
  const flaggedChecks = report.areas.reduce(
    (acc, a) => acc + a.items.filter((i) => i.condition === 'damaged' || i.condition === 'fair').length,
    0
  );

  return (
    <div className="min-h-screen bg-main text-primary">
      {/* ==========================================================================
          Top Sticky Header
          ========================================================================== */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-brand">
            <div className="app-logo-box">
              <Home size={22} />
            </div>
            <div>
              <div className="flex-center gap-xs">
                <h1 className="app-title">InspectA4</h1>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/30">
                  A4 PRO
                </span>
              </div>
              <p className="app-subtitle">Mobile Property Inspection &amp; Report Generator</p>
            </div>
          </div>

          <div className="app-actions">
            {/* Auto-save indicator */}
            <div className="hidden sm:flex items-center gap-xs text-xs text-muted mr-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{saveStatus}</span>
            </div>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="btn-secondary btn-sm flex-center gap-xs"
              title="Load demo inspection data"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Demo Data</span>
            </button>

            <button
              type="button"
              onClick={handleNewReport}
              className="btn-secondary btn-sm flex-center gap-xs"
              title="Start a new report"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="btn-secondary btn-sm flex-center gap-xs"
              title="Preview A4 document"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="btn-primary btn-sm flex-center gap-xs"
              title="Export A4 PDF directly"
            >
              <Download size={14} />
              <span>{isExporting ? 'Generating...' : 'Export A4 PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================================================
          Main Shell Container
          ========================================================================== */}
      <main className="app-wrapper">
        {/* Navigation Tabs Bar */}
        <nav className="nav-tabs-bar" aria-label="Inspection Sections">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`nav-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          >
            <Building size={15} />
            <span>1. Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('areas')}
            className={`nav-tab-btn ${activeTab === 'areas' ? 'active' : ''}`}
          >
            <CheckSquare size={15} />
            <span>2. Rooms ({report.areas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`nav-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          >
            <Camera size={15} />
            <span>3. Photos ({totalPhotos})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`nav-tab-btn ${activeTab === 'signatures' ? 'active' : ''}`}
          >
            <PenTool size={15} />
            <span>4. Sign &amp; Close</span>
          </button>
        </nav>

        {/* ==========================================================================
            TAB 1: PROPERTY & INSPECTION DETAILS
            ========================================================================== */}
        {activeTab === 'details' && (
          <div>
            <div className="content-card">
              <div className="card-title-group">
                <div>
                  <h2 className="card-title">Property &amp; Tenancy Details</h2>
                  <p className="card-subtitle">General information printed on Page 1 of the A4 report</p>
                </div>
                <div className="flex-center gap-xs text-xs text-muted">
                  <Calendar size={14} />
                  <span>{report.inspectionDate}</span>
                </div>
              </div>

              <div className="form-grid-2 mb-md">
                <div>
                  <label className="input-label">Property Address *</label>
                  <input
                    type="text"
                    value={report.propertyAddress}
                    onChange={(e) => setReport({ ...report, propertyAddress: e.target.value })}
                    placeholder="e.g. 142 Oceanview Parade, Apt 4B, Sydney"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Inspection Type</label>
                  <select
                    value={report.inspectionType}
                    onChange={(e) =>
                      setReport({ ...report, inspectionType: e.target.value as InspectionType })
                    }
                  >
                    <option value="move-in">Move-in Condition Report</option>
                    <option value="move-out">Move-out / Bond Inspection</option>
                    <option value="routine">Routine Periodic Inspection</option>
                    <option value="pre-purchase">Pre-Purchase Condition Check</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-3 mb-md">
                <div>
                  <label className="input-label">Inspection Date</label>
                  <input
                    type="date"
                    value={report.inspectionDate}
                    onChange={(e) => setReport({ ...report, inspectionDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Tenant / Client Name</label>
                  <input
                    type="text"
                    value={report.tenantName}
                    onChange={(e) => setReport({ ...report, tenantName: e.target.value })}
                    placeholder="e.g. Sarah & Liam Jenkins"
                  />
                </div>

                <div>
                  <label className="input-label">Landlord / Owner / Agency</label>
                  <input
                    type="text"
                    value={report.landlordName}
                    onChange={(e) => setReport({ ...report, landlordName: e.target.value })}
                    placeholder="e.g. Horizon Realty Trust"
                  />
                </div>
              </div>
            </div>

            {/* Inspector Profile */}
            <div className="content-card">
              <div className="card-title-group">
                <div>
                  <h2 className="card-title">Inspector &amp; Agency Credentials</h2>
                  <p className="card-subtitle">Official details for certified signature sign-off</p>
                </div>
                <ShieldCheck size={18} className="text-accent" />
              </div>

              <div className="form-grid-2 mb-md">
                <div>
                  <label className="input-label">Inspector Name</label>
                  <input
                    type="text"
                    value={report.inspectorName}
                    onChange={(e) => setReport({ ...report, inspectorName: e.target.value })}
                    placeholder="e.g. Alex Mercer"
                  />
                </div>

                <div>
                  <label className="input-label">Agency / Inspection Company</label>
                  <input
                    type="text"
                    value={report.inspectorCompany}
                    onChange={(e) => setReport({ ...report, inspectorCompany: e.target.value })}
                    placeholder="e.g. Apex Property Management Ltd"
                  />
                </div>
              </div>

              <div className="form-grid-2 mb-md">
                <div>
                  <label className="input-label">Inspector Email</label>
                  <input
                    type="email"
                    value={report.inspectorEmail}
                    onChange={(e) => setReport({ ...report, inspectorEmail: e.target.value })}
                    placeholder="e.g. alex.mercer@apexpm.com"
                  />
                </div>

                <div>
                  <label className="input-label">Inspector Phone</label>
                  <input
                    type="tel"
                    value={report.inspectorPhone}
                    onChange={(e) => setReport({ ...report, inspectorPhone: e.target.value })}
                    placeholder="e.g. +1 (555) 234-8901"
                  />
                </div>
              </div>
            </div>

            {/* General Overview Summary */}
            <div className="content-card">
              <h2 className="card-title mb-xs">Executive Summary &amp; General Remarks</h2>
              <p className="card-subtitle mb-md">
                Summarize overall property state, smoke alarms, utility meters, or general maintenance
              </p>
              <textarea
                value={report.generalSummary}
                onChange={(e) => setReport({ ...report, generalSummary: e.target.value })}
                rows={4}
                placeholder="Overall condition of the property, smoke alarm verification, general cleanliness, tenant feedback..."
              />
            </div>

            {/* Next Tab Button */}
            <div className="flex justify-end mt-md">
              <button
                type="button"
                onClick={() => setActiveTab('areas')}
                className="btn-primary flex-center gap-xs"
              >
                <span>Continue to Rooms Checklist</span>
                <CheckSquare size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 2: ROOMS & CHECKLISTS
            ========================================================================== */}
        {activeTab === 'areas' && (
          <div>
            {/* Quick Metrics Bar */}
            <div className="flex-between mb-md flex-wrap gap-xs">
              <div className="flex items-center gap-xs">
                <span className="badge-pill bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  {cleanChecks} Clean
                </span>
                {flaggedChecks > 0 && (
                  <span className="badge-pill bg-amber-950 text-amber-400 border border-amber-800/40">
                    {flaggedChecks} Flagged Defect{flaggedChecks > 1 ? 's' : ''}
                  </span>
                )}
                <span className="badge-pill bg-slate-800 text-slate-300">
                  {totalChecks} Total Checks
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAreaModal(true)}
                className="btn-secondary btn-sm flex-center gap-xs"
              >
                <Plus size={14} />
                <span>Add Custom Room</span>
              </button>
            </div>

            {/* List of Area Accordions */}
            <div className="space-y-md">
              {report.areas.map((area, idx) => (
                <AreaSection
                  key={area.id}
                  area={area}
                  index={idx}
                  onUpdate={handleUpdateArea}
                  onDelete={report.areas.length > 1 ? () => handleDeleteArea(area.id) : undefined}
                />
              ))}
            </div>

            {/* Add Custom Room Modal */}
            {showAddAreaModal && (
              <div className="modal-backdrop" onClick={() => setShowAddAreaModal(false)}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title">Add Custom Inspection Room</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddAreaModal(false)}
                      className="btn-icon-circle"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleAddArea} className="p-md">
                    <label className="input-label">Room / Area Name</label>
                    <input
                      type="text"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="e.g. Home Office, Attic, Pool Area, Basement"
                      className="mb-md"
                      autoFocus
                      required
                    />
                    <div className="flex justify-end gap-xs">
                      <button
                        type="button"
                        onClick={() => setShowAddAreaModal(false)}
                        className="btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary btn-sm">
                        Create Room
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex-between mt-lg">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="btn-secondary flex-center gap-xs"
              >
                <span>Back to Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className="btn-primary flex-center gap-xs"
              >
                <span>Review Photos ({totalPhotos})</span>
                <Camera size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 3: EVIDENCE PHOTOS OVERVIEW
            ========================================================================== */}
        {activeTab === 'photos' && (
          <div>
            {/* Storage & Compression Banner */}
            <div className="content-card mb-md">
              <div className="flex-between flex-wrap gap-md">
                <div>
                  <h2 className="card-title flex-center gap-xs">
                    <Sparkles size={18} className="text-accent" />
                    <span>Smart Photo Compression Engine</span>
                  </h2>
                  <p className="card-subtitle mt-xs">
                    High clarity for A4 documents (1600px max, 0.83 JPEG quality) without bloating file size
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatBytes(totalCompressedBytes)}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    Saved {totalSavings}% (from {formatBytes(totalOriginalBytes)})
                  </div>
                </div>
              </div>
            </div>

            {/* Photos Grouped by Area */}
            {totalPhotos === 0 ? (
              <div className="content-card text-center py-xl">
                <Camera size={40} className="text-muted mx-auto mb-sm" />
                <h3 className="text-base font-bold text-slate-200 mb-xs">No Photos Captured Yet</h3>
                <p className="text-xs text-muted mb-md">
                  Go to any room in the 'Rooms' tab to take or upload evidence photos.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('areas')}
                  className="btn-primary btn-sm mx-auto flex-center gap-xs"
                >
                  <CheckSquare size={14} />
                  <span>Go to Rooms Checklist</span>
                </button>
              </div>
            ) : (
              <div className="space-y-lg">
                {report.areas
                  .filter((a) => a.photos && a.photos.length > 0)
                  .map((area) => (
                    <div key={area.id} className="content-card">
                      <div className="flex-between mb-sm">
                        <h3 className="text-sm font-bold text-slate-100 flex-center gap-xs">
                          <span>{area.name}</span>
                          <span className="badge-pill bg-slate-800 text-slate-300">
                            {area.photos.length} photo{area.photos.length > 1 ? 's' : ''}
                          </span>
                        </h3>
                        <span className={`condition-pill ${area.overallCondition}`}>
                          {area.overallCondition.toUpperCase()}
                        </span>
                      </div>

                      <div className="photos-grid">
                        {area.photos.map((photo) => (
                          <div key={photo.id} className="photo-card">
                            <div className="photo-image-wrapper">
                              <img
                                src={photo.dataUrl}
                                alt={photo.caption || 'Evidence'}
                                className="photo-thumb"
                              />
                              <div className="photo-size-tag">
                                <span>{formatBytes(photo.compressedSize)}</span>
                                <span className="text-emerald-400 ml-1 font-bold">
                                  (-
                                  {photo.originalSize > 0
                                    ? Math.round(
                                        ((photo.originalSize - photo.compressedSize) /
                                          photo.originalSize) *
                                          100
                                      )
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </div>
                            <div className="photo-card-body">
                              <p className="text-xs text-slate-200 font-medium">
                                {photo.caption || 'No caption provided'}
                              </p>
                              <div className="photo-meta-row mt-xs">
                                <span>
                                  {photo.width}×{photo.height}px
                                </span>
                                <span>
                                  {new Date(photo.takenAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex-between mt-lg">
              <button
                type="button"
                onClick={() => setActiveTab('areas')}
                className="btn-secondary flex-center gap-xs"
              >
                <span>Back to Rooms</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('signatures')}
                className="btn-primary flex-center gap-xs"
              >
                <span>Proceed to Signatures</span>
                <PenTool size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 4: SIGNATURES & HANDOVER
            ========================================================================== */}
        {activeTab === 'signatures' && (
          <div>
            {/* Keys Handover Section */}
            <div className="content-card">
              <div className="card-title-group">
                <div>
                  <h2 className="card-title">Keys &amp; Access Handover</h2>
                  <p className="card-subtitle">Document key quantities and access fobs/remotes provided</p>
                </div>
                <Key size={18} className="text-accent" />
              </div>

              <div className="form-grid-2 mb-md">
                <div>
                  <label className="input-label">Keys Count Provided</label>
                  <input
                    type="number"
                    min="0"
                    value={report.keysHandover?.keysProvided || 0}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        keysHandover: {
                          ...report.keysHandover,
                          keysProvided: parseInt(e.target.value) || 0
                        }
                      })
                    }
                  />
                </div>

                <div>
                  <label className="input-label">Remotes / Access Fobs Provided</label>
                  <input
                    type="number"
                    min="0"
                    value={report.keysHandover?.remotesProvided || 0}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        keysHandover: {
                          ...report.keysHandover,
                          remotesProvided: parseInt(e.target.value) || 0
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Key Handover Notes</label>
                <input
                  type="text"
                  value={report.keysHandover?.notes || ''}
                  onChange={(e) =>
                    setReport({
                      ...report,
                      keysHandover: {
                        ...report.keysHandover,
                        notes: e.target.value
                      }
                    })
                  }
                  placeholder="e.g. 2x Front door, 1x Mailbox, 2x Garage remotes tested"
                />
              </div>
            </div>

            {/* Digital Signatures Grid */}
            <div className="content-card">
              <h2 className="card-title mb-xs">Digital Signatures &amp; Declarations</h2>
              <p className="card-subtitle mb-md">
                Official sign-off for certified inclusion in the final A4 PDF
              </p>

              <div className="form-grid-2">
                {/* Inspector Signature */}
                <SignaturePad
                  title="Inspector Sign-Off"
                  signerName={report.inspectorName || 'Lead Inspector'}
                  initialSignature={report.signatures?.inspector?.signatureData}
                  onSave={(signatureData) =>
                    setReport({
                      ...report,
                      signatures: {
                        ...report.signatures,
                        inspector: {
                          name: report.inspectorName || 'Alex Mercer',
                          signatureData,
                          date: report.inspectionDate
                        }
                      }
                    })
                  }
                />

                {/* Tenant / Client Signature */}
                <SignaturePad
                  title="Tenant / Client Acknowledgement"
                  signerName={report.tenantName || 'Tenant / Client'}
                  initialSignature={report.signatures?.tenant?.signatureData}
                  onSave={(signatureData) =>
                    setReport({
                      ...report,
                      signatures: {
                        ...report.signatures,
                        tenant: {
                          name: report.tenantName || 'Tenant',
                          signatureData,
                          date: report.inspectionDate
                        }
                      }
                    })
                  }
                />
              </div>
            </div>

            {/* Complete & Export CTA */}
            <div className="content-card bg-gradient-to-r from-sky-950/80 to-blue-900/60 border-sky-800/40 text-center py-lg">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-xs" />
              <h3 className="text-base font-bold text-white mb-2xs">Inspection Ready for A4 Export</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto mb-md">
                All {report.areas.length} rooms, {totalChecks} checks, {totalPhotos} compressed evidence photos,
                and signatures are compiled into a print-ready A4 document.
              </p>

              <div className="flex-center gap-sm flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="btn-secondary flex-center gap-xs"
                >
                  <Eye size={15} />
                  <span>Preview A4 Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="btn-primary flex-center gap-xs"
                >
                  <Download size={15} />
                  <span>{isExporting ? 'Generating A4 PDF...' : 'Download A4 PDF Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================================================
          Persistent Mobile Sticky Dock
          ========================================================================== */}
      <div className="mobile-dock">
        <div className="mobile-dock-content">
          <div className="dock-stats">
            <span className="text-xs font-bold text-slate-200">
              {report.areas.length} Rooms
            </span>
            <span className="text-muted text-xs">•</span>
            <span className="text-xs font-semibold text-emerald-400">
              {totalPhotos} Photos
            </span>
            {flaggedChecks > 0 && (
              <>
                <span className="text-muted text-xs">•</span>
                <span className="text-xs font-semibold text-amber-400">
                  {flaggedChecks} Flagged
                </span>
              </>
            )}
          </div>

          <div className="flex-center gap-xs">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="btn-secondary btn-sm flex-center gap-2xs"
            >
              <Eye size={13} />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="btn-primary btn-sm flex-center gap-xs"
            >
              <Download size={14} />
              <span>{isExporting ? 'Exporting...' : 'Export A4'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          A4 PDF Live Preview & Direct Download Modal
          ========================================================================== */}
      {showPreviewModal && (
        <PDFPreviewModal
          report={report}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
};

export default App;
