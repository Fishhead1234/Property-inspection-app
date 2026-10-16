import React, { useState } from 'react';
import type { InspectionReport } from '../types/inspection';
import { formatBytes } from '../utils/imageCompressor';
import type { User } from '@supabase/supabase-js';
import {
  Plus,
  Home,
  Calendar,
  Building,
  Camera,
  Eye,
  Download,
  Trash2,
  Copy,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Cloud,
  RefreshCw,
  Database
} from 'lucide-react';

interface Props {
  reports: InspectionReport[];
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onSyncCloud?: () => void;
  isSyncing?: boolean;
  onStartNew: () => void;
  onOpenReport: (report: InspectionReport) => void;
  onLoadDemo: () => void;
  onDeleteReport: (id: string) => void;
  onDuplicateReport: (report: InspectionReport) => void;
  onPreviewReport: (report: InspectionReport) => void;
  onDownloadReport: (report: InspectionReport) => void;
}

export const DashboardView: React.FC<Props> = ({
  reports,
  currentUser,
  onOpenAuth,
  onSyncCloud,
  isSyncing,
  onStartNew,
  onOpenReport,
  onLoadDemo,
  onDeleteReport,
  onDuplicateReport,
  onPreviewReport,
  onDownloadReport
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.propertyAddress || '').toLowerCase().includes(q) ||
      (r.tenantName || '').toLowerCase().includes(q) ||
      (r.inspectorName || '').toLowerCase().includes(q) ||
      (r.inspectionType || '').toLowerCase().includes(q)
    );
  });

  // Calculate overall metrics
  const totalPhotos = reports.reduce(
    (acc, r) => acc + r.areas.reduce((pAcc, a) => pAcc + (a.photos?.length || 0), 0),
    0
  );
  const totalRooms = reports.reduce((acc, r) => acc + r.areas.length, 0);

  return (
    <div className="dashboard-container">
      {/* ==========================================================================
          Hero Action Section
          ========================================================================== */}
      <section className="dashboard-hero-card">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} className="text-accent" />
            <span>Mobile Property Inspections &amp; Certified A4 Reports</span>
          </div>
          <h1 className="hero-title">Property Inspection Manager</h1>
          <p className="hero-subtitle">
            Conduct on-site room-by-room condition checks, capture smart-compressed high-clarity photos,
            and export certified A4 PDF reports in seconds.
          </p>

          {/* Prominent High-Visibility Call to Action */}
          <div className="hero-actions-group">
            <button
              type="button"
              onClick={onStartNew}
              className="btn-hero-primary"
              id="btn-hero-start-new"
            >
              <Plus size={22} className="stroke-[2.5]" />
              <span>Start New Inspection</span>
            </button>

            {reports.length === 0 && (
              <button
                type="button"
                onClick={onLoadDemo}
                className="btn-hero-secondary"
                id="btn-hero-load-demo"
              >
                <Sparkles size={16} className="text-amber-400" />
                <span>Load Sample Inspection</span>
              </button>
            )}
          </div>

          {/* High-Visibility Cloud Sync & Database Banner */}
          <div className="dashboard-cloud-banner">
            <div className="cloud-banner-left">
              <div className="cloud-banner-icon-box">
                <Cloud size={24} className={currentUser ? 'text-emerald-400' : 'text-sky-400'} />
              </div>
              <div>
                <div className="cloud-banner-title-row">
                  <span className="cloud-banner-title">
                    {currentUser ? 'Cloud Team Sync Active' : 'Multi-Device Cloud Database'}
                  </span>
                  {currentUser ? (
                    <span className="cloud-badge-connected">
                      <span className="cloud-pulse-dot" /> Connected
                    </span>
                  ) : (
                    <span className="cloud-badge-local">Local Mode</span>
                  )}
                </div>
                <p className="cloud-banner-desc">
                  {currentUser
                    ? `Signed in as ${currentUser.email} • Inspections sync in real-time across your team`
                    : 'Connect your free Supabase database to sync all inspections across your phone, tablet, and team.'}
                </p>
              </div>
            </div>

            <div className="cloud-banner-actions">
              {currentUser && onSyncCloud && (
                <button
                  type="button"
                  onClick={onSyncCloud}
                  disabled={isSyncing}
                  className="btn-cloud-sync"
                  title="Sync with cloud now"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>
              )}
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="btn-cloud-connect"
                  id="btn-open-cloud-setup"
                >
                  <Database size={15} />
                  <span>{currentUser ? 'Account & Settings' : 'Connect Cloud Database'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Quick Stats */}
        {reports.length > 0 && (
          <div className="hero-stats-grid">
            <div className="hero-stat-box">
              <span className="hero-stat-value">{reports.length}</span>
              <span className="hero-stat-label">Properties</span>
            </div>
            <div className="hero-stat-box">
              <span className="hero-stat-value">{totalRooms}</span>
              <span className="hero-stat-label">Rooms Checked</span>
            </div>
            <div className="hero-stat-box">
              <span className="hero-stat-value">{totalPhotos}</span>
              <span className="hero-stat-label">Evidence Photos</span>
            </div>
          </div>
        )}
      </section>

      {/* ==========================================================================
          Properties List Section
          ========================================================================== */}
      {reports.length === 0 ? (
        /* Empty State */
        <section className="dashboard-empty-card">
          <div className="empty-icon-bubble">
            <Building size={42} className="text-accent" />
          </div>
          <h2 className="empty-title">No Properties in the System Yet</h2>
          <p className="empty-desc">
            You don't have any inspection reports saved yet. Click the big button below to begin
            inspecting your first property or try our sample demo inspection.
          </p>

          <div className="empty-actions">
            <button
              type="button"
              onClick={onStartNew}
              className="btn-hero-primary empty-pulse-btn"
            >
              <Plus size={22} className="stroke-[2.5]" />
              <span>Start New Inspection</span>
            </button>

            <button
              type="button"
              onClick={onLoadDemo}
              className="btn-secondary btn-sm flex-center gap-xs mt-sm text-xs"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Or Load Sample Property with Photos</span>
            </button>
          </div>
        </section>
      ) : (
        /* Properties Grid */
        <section className="properties-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Inspected Properties ({reports.length})</h2>
              <p className="section-subtitle">Select a property to view, edit, or generate an A4 PDF report</p>
            </div>

            {/* Prominent Secondary New Button */}
            <button
              type="button"
              onClick={onStartNew}
              className="btn-primary btn-sm flex-center gap-xs"
            >
              <Plus size={16} />
              <span>New Inspection</span>
            </button>
          </div>

          {/* Search Filter Bar */}
          <div className="search-filter-box">
            <Search size={16} className="text-muted search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address, tenant name, or inspection type..."
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
              >
                ✕
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="property-cards-grid">
            {filteredReports.map((item) => {
              const photoCount = item.areas.reduce(
                (acc, a) => acc + (a.photos?.length || 0),
                0
              );
              const flaggedCount = item.areas.reduce(
                (acc, a) =>
                  acc +
                  a.items.filter((i) => i.condition === 'damaged' || i.condition === 'fair').length,
                0
              );
              const totalBytes = item.areas.reduce(
                (acc, a) =>
                  acc + (a.photos?.reduce((pAcc, p) => pAcc + p.compressedSize, 0) || 0),
                0
              );

              const typeBadge =
                item.inspectionType === 'move-in'
                  ? 'Move-In'
                  : item.inspectionType === 'move-out'
                  ? 'Move-Out'
                  : item.inspectionType === 'routine'
                  ? 'Routine'
                  : 'Pre-Purchase';

              return (
                <div key={item.id} className="property-card">
                  {/* Card Header */}
                  <div className="property-card-header">
                    <div className="property-address-group">
                      <div className="property-avatar">
                        <Home size={18} />
                      </div>
                      <div>
                        <h3 className="property-address">
                          {item.propertyAddress || 'Untitled Property'}
                        </h3>
                        <div className="property-subtext">
                          <Calendar size={12} className="inline mr-1 text-muted" />
                          <span>{item.inspectionDate}</span>
                          {item.tenantName && (
                            <>
                              <span className="mx-1">•</span>
                              <span>Tenant: {item.tenantName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`badge-type-pill ${item.inspectionType}`}>
                      {typeBadge}
                    </span>
                  </div>

                  {/* Card Stats Pills */}
                  <div className="property-metrics-row">
                    <span className="meta-chip">
                      <Building size={12} />
                      <span>{item.areas.length} Rooms</span>
                    </span>

                    <span className="meta-chip">
                      <Camera size={12} />
                      <span>
                        {photoCount} Photos {totalBytes > 0 ? `(${formatBytes(totalBytes)})` : ''}
                      </span>
                    </span>

                    {flaggedCount > 0 ? (
                      <span className="meta-chip warning">
                        <AlertTriangle size={12} />
                        <span>{flaggedCount} Flagged</span>
                      </span>
                    ) : (
                      <span className="meta-chip clean">
                        <CheckCircle2 size={12} />
                        <span>All Clear</span>
                      </span>
                    )}
                  </div>

                  {/* Inspector / Agency snippet */}
                  {item.inspectorCompany && (
                    <p className="property-agency-tag">
                      Inspected by {item.inspectorName || 'Inspector'} ({item.inspectorCompany})
                    </p>
                  )}

                  {/* Card Actions */}
                  <div className="property-card-actions">
                    <button
                      type="button"
                      onClick={() => onOpenReport(item)}
                      className="btn-primary btn-sm flex-1 flex-center gap-xs"
                    >
                      <span>Resume / Edit</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPreviewReport(item)}
                      className="btn-secondary btn-sm flex-center gap-xs"
                      title="Preview A4 Document"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadReport(item)}
                      className="btn-secondary btn-sm flex-center gap-xs"
                      title="Export A4 PDF Directly"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateReport(item)}
                      className="btn-icon-subtle"
                      title="Duplicate as new inspection"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteReport(item.id)}
                      className="btn-icon-subtle text-muted hover:text-danger"
                      title="Delete inspection"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
