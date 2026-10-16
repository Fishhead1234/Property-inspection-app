import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { InspectionReport, InspectionArea, InspectionType } from './types/inspection';
import {
  createDefaultNewReport,
  createSampleDemoReport,
  saveReport,
  getAllReports,
  deleteReport
} from './services/storageService';
import { downloadA4PDF } from './services/pdfGenerator';
import { formatBytes, compressMultipleImages } from './utils/imageCompressor';
import { AreaSection } from './components/AreaSection';
import { SignaturePad } from './components/SignaturePad';
import { PDFPreviewModal } from './components/PDFPreviewModal';
import { DashboardView } from './components/DashboardView';
import { MultiShotCameraModal } from './components/MultiShotCameraModal';
import { AuthModal } from './components/AuthModal';
import type { User } from '@supabase/supabase-js';
import { subscribeToAuthChanges, getCurrentUser } from './services/authService';
import { syncReportToCloud, fetchReportsFromCloud, deleteReportFromCloud } from './services/cloudSyncService';
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
  Building,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  UploadCloud,
  Cloud
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [savedReports, setSavedReports] = useState<InspectionReport[]>([]);
  const [report, setReport] = useState<InspectionReport>(createDefaultNewReport);
  const [activeTab, setActiveTab] = useState<'details' | 'areas' | 'photos' | 'signatures'>('details');
  const [previewTarget, setPreviewTarget] = useState<InspectionReport | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved locally');
  const [newAreaName, setNewAreaName] = useState('');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);

  // Quick Photo Hub state in Tab 3
  const [hubTargetAreaId, setHubTargetAreaId] = useState<string>('');
  const [hubIsCompressing, setHubIsCompressing] = useState(false);
  const [hubProgress, setHubProgress] = useState<{ current: number; total: number } | null>(null);
  const [hubIsDragging, setHubIsDragging] = useState(false);
  const [showHubMultiShot, setShowHubMultiShot] = useState(false);
  const hubCameraInputRef = useRef<HTMLInputElement>(null);
  const hubFileInputRef = useRef<HTMLInputElement>(null);
  const hubFolderInputRef = useRef<HTMLInputElement>(null);

  // Load all reports from IndexedDB
  const loadReports = useCallback(async () => {
    try {
      const list = await getAllReports();
      const sorted = [...list].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSavedReports(sorted);
      return sorted;
    } catch (err) {
      console.error('Error loading reports from IndexedDB:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Sync all reports from cloud
  const handleSyncCloud = useCallback(async () => {
    setIsSyncingCloud(true);
    try {
      const { reports: cloudReports, error } = await fetchReportsFromCloud();
      if (!error && cloudReports.length > 0) {
        await loadReports();
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncingCloud(false);
    }
  }, [loadReports]);

  // Listen to auth state changes and initial session
  useEffect(() => {
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      if (user) {
        handleSyncCloud();
      }
    });

    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      if (user) {
        handleSyncCloud();
      }
    });

    return () => unsubscribe();
  }, [handleSyncCloud]);

  // Auto-save whenever active report changes (while in editor mode)
  useEffect(() => {
    if (currentView !== 'editor' || !report || !report.id) return;
    const timer = setTimeout(() => {
      saveReport(report)
        .then(() => {
          setSaveStatus(
            currentUser
              ? `Cloud & Local Saved • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Saved locally • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          );
          getAllReports().then((list) => {
            const sorted = [...list].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            setSavedReports(sorted);
          });
          if (currentUser) {
            syncReportToCloud(report, currentUser).catch((err) => console.warn('Cloud sync error:', err));
          }
        })
        .catch((err) => console.error('Auto-save error:', err));
    }, 600);

    return () => clearTimeout(timer);
  }, [report, currentView, currentUser]);

  const handleStartNew = async () => {
    const fresh = createDefaultNewReport();
    await saveReport(fresh);
    if (currentUser) {
      syncReportToCloud(fresh, currentUser).catch(() => {});
    }
    setReport(fresh);
    await loadReports();
    setActiveTab('details');
    setCurrentView('editor');
  };

  const handleOpenReport = (selected: InspectionReport) => {
    setReport(selected);
    setActiveTab('details');
    setCurrentView('editor');
  };

  const handleLoadDemo = async () => {
    const demo = createSampleDemoReport();
    await saveReport(demo);
    if (currentUser) {
      syncReportToCloud(demo, currentUser).catch(() => {});
    }
    setReport(demo);
    await loadReports();
    setActiveTab('details');
    setCurrentView('editor');
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm('Are you sure you want to delete this inspection report? This cannot be undone.')) {
      await deleteReport(id);
      if (currentUser) {
        deleteReportFromCloud(id).catch(() => {});
      }
      const remaining = savedReports.filter((r) => r.id !== id);
      setSavedReports(remaining);
      if (report.id === id) {
        if (remaining.length > 0) {
          setReport(remaining[0]);
        } else {
          setReport(createDefaultNewReport());
        }
      }
    }
  };

  const handleDuplicateReport = async (original: InspectionReport) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const duplicated: InspectionReport = {
      ...original,
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      propertyAddress: original.propertyAddress ? `${original.propertyAddress} (Copy)` : 'Copy of Property',
      inspectionDate: dateStr,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    await saveReport(duplicated);
    await loadReports();
  };

  const handlePreviewReport = (target: InspectionReport) => {
    setPreviewTarget(target);
    setShowPreviewModal(true);
  };

  const handleDownloadReport = async (target: InspectionReport) => {
    setIsExporting(true);
    try {
      await downloadA4PDF(target);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Error generating A4 PDF. Please check your photos and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackToDashboard = async () => {
    if (report && report.id) {
      await saveReport(report);
    }
    await loadReports();
    setCurrentView('dashboard');
  };

  const currentUploadTargetId = hubTargetAreaId || (report.areas[0]?.id ?? '');

  const handleHubFiles = async (fileList: File[], overrideTargetId?: string) => {
    const chosenAreaId = overrideTargetId || currentUploadTargetId;
    if (!chosenAreaId) {
      alert('Please select a room to add photos to.');
      return;
    }

    const imageFiles = fileList.filter(
      (file) =>
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|avif|bmp|gif|heic|heif)$/i.test(file.name)
    );

    if (imageFiles.length === 0) {
      alert('No valid image files found in the selection. Please select JPG, PNG, WEBP, or HEIC photos.');
      return;
    }

    setHubIsCompressing(true);
    setHubProgress({ current: 0, total: imageFiles.length });

    try {
      const compressed = await compressMultipleImages(imageFiles, (curr, total) => {
        setHubProgress({ current: curr, total });
      });

      const updatedAreas = report.areas.map((a) =>
        a.id === chosenAreaId ? { ...a, photos: [...(a.photos || []), ...compressed] } : a
      );
      setReport({ ...report, areas: updatedAreas });
    } catch (err) {
      console.error('Hub photo compression error:', err);
      alert('Error compressing photos. Please check file format and try again.');
    } finally {
      setHubIsCompressing(false);
      setHubProgress(null);
      if (hubFileInputRef.current) hubFileInputRef.current.value = '';
      if (hubCameraInputRef.current) hubCameraInputRef.current.value = '';
      if (hubFolderInputRef.current) hubFolderInputRef.current.value = '';
    }
  };

  const handleHubDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHubIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleHubFiles(Array.from(files));
    }
  };

  const handleHubMultiShotSave = async (dataUrls: string[]) => {
    try {
      const files = await Promise.all(
        dataUrls.map(async (dataUrl, idx) => {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          return new File([blob], `hub_shot_${Date.now()}_${idx + 1}.jpg`, { type: 'image/jpeg' });
        })
      );
      await handleHubFiles(files);
    } catch (err) {
      console.error('Error saving multi-shot photos from hub:', err);
    }
  };

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

  // Metrics for active report in editor
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
          {currentView === 'dashboard' ? (
            /* Dashboard Header */
            <>
              <div className="app-brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
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
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-200 transition-all flex items-center gap-1.5"
                  title="Cloud Account & Database Settings"
                >
                  <Cloud size={14} className={currentUser ? 'text-emerald-400' : 'text-blue-400'} />
                  <span className="hidden sm:inline">
                    {currentUser ? currentUser.email?.split('@')[0] : 'Cloud Sync'}
                  </span>
                  {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                <button
                  type="button"
                  onClick={handleStartNew}
                  className="btn-header-new"
                  title="Start a new property inspection"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                  <span>Start New Inspection</span>
                </button>
              </div>
            </>
          ) : (
            /* Editor Header */
            <>
              <div className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="btn-back-dashboard"
                  title="Return to Properties Dashboard"
                >
                  <ArrowLeft size={15} />
                  <span>All Properties ({savedReports.length})</span>
                </button>

                <div className="hidden md:flex items-center gap-xs text-xs text-muted">
                  <ChevronRight size={14} />
                  <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                    {report.propertyAddress || 'Untitled Property'}
                  </span>
                </div>
              </div>

              <div className="app-actions">
                {/* Cloud sync button */}
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-200 transition-all mr-xs"
                  title="Cloud Account & Sync"
                >
                  <Cloud size={14} className={currentUser ? 'text-emerald-400' : 'text-blue-400'} />
                  {currentUser ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ) : (
                    <span className="hidden lg:inline text-muted text-[11px]">Local</span>
                  )}
                </button>

                {/* Auto-save indicator */}
                <div className="hidden sm:flex items-center gap-xs text-xs text-muted mr-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{saveStatus}</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartNew}
                  className="btn-header-new hidden sm:inline-flex"
                  title="Start a new inspection"
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>New</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewTarget(report);
                    setShowPreviewModal(true);
                  }}
                  className="btn-secondary btn-sm flex-center gap-xs"
                  title="Preview A4 document"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadReport(report)}
                  disabled={isExporting}
                  className="btn-primary btn-sm flex-center gap-xs"
                  title="Export A4 PDF directly"
                >
                  <Download size={14} />
                  <span>{isExporting ? 'Generating...' : 'Export A4 PDF'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ==========================================================================
          Main Shell Container
          ========================================================================== */}
      <main className="app-wrapper">
        {currentView === 'dashboard' ? (
          /* ==========================================================================
             LANDING PAGE / DASHBOARD VIEW
             ========================================================================== */
          <DashboardView
            reports={savedReports}
            currentUser={currentUser}
            onOpenAuth={() => setShowAuthModal(true)}
            onSyncCloud={handleSyncCloud}
            isSyncing={isSyncingCloud}
            onStartNew={handleStartNew}
            onOpenReport={handleOpenReport}
            onLoadDemo={handleLoadDemo}
            onDeleteReport={handleDeleteReport}
            onDuplicateReport={handleDuplicateReport}
            onPreviewReport={handlePreviewReport}
            onDownloadReport={handleDownloadReport}
          />
        ) : (
          /* ==========================================================================
             INSPECTION EDITOR VIEW
             ========================================================================== */
          <div>
            {/* Breadcrumb & Property Title Quick Bar */}
            <div className="editor-top-bar mb-md">
              <div className="flex-between flex-wrap gap-xs">
                <div className="flex items-center gap-xs">
                  <span className={`badge-type-pill ${report.inspectionType}`}>
                    {report.inspectionType.toUpperCase()}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-sm sm:max-w-lg">
                    {report.propertyAddress || 'Untitled Property (Enter Address in Details)'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="text-xs text-muted hover:text-accent flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Properties List</span>
                </button>
              </div>
            </div>

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

                {/* Quick Photo Upload Hub */}
                <div className="photo-upload-hub">
                  <div className="photo-upload-hub-header">
                    <div>
                      <h3 className="card-title flex-center gap-xs">
                        <Camera size={18} className="text-accent" />
                        <span>Add Evidence Photos</span>
                      </h3>
                      <p className="card-subtitle mt-2xs">
                        Take a live photo on-site, select from gallery, or import an entire folder
                      </p>
                    </div>

                    <div className="hub-room-select-group">
                      <label className="text-xs font-bold text-muted uppercase">Assign to Room:</label>
                      <select
                        value={currentUploadTargetId}
                        onChange={(e) => setHubTargetAreaId(e.target.value)}
                        className="hub-room-select"
                      >
                        {report.areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name} ({area.photos?.length || 0} photos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hidden Inputs for Hub */}
                  <input
                    ref={hubCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => e.target.files && handleHubFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <input
                    ref={hubFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleHubFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <input
                    ref={hubFolderInputRef}
                    type="file"
                    // @ts-expect-error webkitdirectory is standard in HTML5 for folder upload
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={(e) => e.target.files && handleHubFiles(Array.from(e.target.files))}
                    className="hidden"
                  />

                  {/* 3 Prominent Action Buttons */}
                  <div className="photo-actions-grid">
                    <button
                      type="button"
                      onClick={() => setShowHubMultiShot(true)}
                      disabled={hubIsCompressing}
                      className="btn-primary photo-action-btn"
                      title="Open live multi-shot camera to take continuous photos in this room"
                    >
                      <Camera size={16} className="stroke-[2.5]" />
                      <span>Multi-Shot Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => hubFileInputRef.current?.click()}
                      disabled={hubIsCompressing}
                      className="btn-secondary photo-action-btn"
                      title="Select one or multiple photos from gallery or files"
                    >
                      <ImageIcon size={16} />
                      <span>Select Photos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => hubFolderInputRef.current?.click()}
                      disabled={hubIsCompressing}
                      className="btn-secondary photo-action-btn"
                      title="Upload all photos directly from an entire folder"
                    >
                      <FolderOpen size={16} />
                      <span>Load from Folder</span>
                    </button>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    className={`photo-drop-zone ${hubIsDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHubIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHubIsDragging(false);
                    }}
                    onDrop={handleHubDrop}
                  >
                    <UploadCloud size={20} className="text-muted mb-2xs" />
                    <p className="drop-zone-text">
                      Drag &amp; drop photos or whole folders into{' '}
                      <strong>
                        {report.areas.find((a) => a.id === currentUploadTargetId)?.name || 'the selected room'}
                      </strong>
                    </p>
                  </div>

                  {/* Compression Progress Bar */}
                  {hubIsCompressing && hubProgress && (
                    <div className="compression-progress-card mt-sm">
                      <div className="flex-between text-xs font-semibold mb-xs">
                        <span className="flex-center gap-xs text-accent">
                          <Sparkles size={14} className="animate-spin" />
                          <span>Compressing &amp; Optimizing High-Res Photos...</span>
                        </span>
                        <span>
                          {hubProgress.current} / {hubProgress.total}
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${(hubProgress.current / hubProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Multi-Shot Live Camera Viewfinder Modal for Hub */}
                  {showHubMultiShot && (
                    <MultiShotCameraModal
                      areaName={report.areas.find((a) => a.id === currentUploadTargetId)?.name || 'Inspection Area'}
                      onSave={handleHubMultiShotSave}
                      onClose={() => setShowHubMultiShot(false)}
                    />
                  )}
                </div>

                {/* Photos Grouped by Area */}
                {totalPhotos === 0 ? (
                  <div className="content-card text-center py-xl">
                    <Camera size={36} className="text-muted mx-auto mb-xs" />
                    <h3 className="text-base font-bold text-slate-200 mb-xs">No Photos Captured Yet</h3>
                    <p className="text-xs text-muted max-w-md mx-auto mb-md">
                      Use the uploader above to take a photo with your camera, pick pictures from your gallery,
                      or load an entire folder. You can also add photos directly within each room in the 'Rooms' tab.
                    </p>
                    <div className="flex-center gap-xs">
                      <button
                        type="button"
                        onClick={() => hubCameraInputRef.current?.click()}
                        className="btn-primary btn-sm flex-center gap-xs"
                      >
                        <Camera size={14} />
                        <span>Take First Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('areas')}
                        className="btn-secondary btn-sm flex-center gap-xs"
                      >
                        <CheckSquare size={14} />
                        <span>Go to Rooms Checklist</span>
                      </button>
                    </div>
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

                            <div className="flex items-center gap-xs">
                              <span className={`condition-pill ${area.overallCondition}`}>
                                {area.overallCondition.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setHubTargetAreaId(area.id);
                                  hubFileInputRef.current?.click();
                                }}
                                className="btn-secondary btn-sm flex-center gap-2xs text-xs"
                                title={`Add more photos to ${area.name}`}
                              >
                                <Plus size={13} />
                                <span>Add More</span>
                              </button>
                            </div>
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
                {/* Keys Handover Section - Omitted for Routine Inspections */}
                {report.inspectionType !== 'routine' && (
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
                )}

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
                      onClick={() => {
                        setPreviewTarget(report);
                        setShowPreviewModal(true);
                      }}
                      className="btn-secondary flex-center gap-xs"
                    >
                      <Eye size={15} />
                      <span>Preview A4 Document</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadReport(report)}
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
          </div>
        )}
      </main>

      {/* ==========================================================================
          Persistent Mobile Sticky Dock (Editor Mode)
          ========================================================================== */}
      {currentView === 'editor' && (
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
                onClick={() => {
                  setPreviewTarget(report);
                  setShowPreviewModal(true);
                }}
                className="btn-secondary btn-sm flex-center gap-2xs"
              >
                <Eye size={13} />
                <span className="hidden sm:inline">Preview</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReport(report)}
                disabled={isExporting}
                className="btn-primary btn-sm flex-center gap-xs"
              >
                <Download size={14} />
                <span>{isExporting ? 'Exporting...' : 'Export A4'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          A4 PDF Live Preview & Direct Download Modal
          ========================================================================== */}
      {showPreviewModal && (
        <PDFPreviewModal
          report={previewTarget || report}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewTarget(null);
          }}
        />
      )}

      {/* ==========================================================================
          Cloud Authentication & Database Connection Modal
          ========================================================================== */}
      {showAuthModal && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setShowAuthModal(false)}
          onAuthChange={(user) => {
            setCurrentUser(user);
            if (user) {
              handleSyncCloud();
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
