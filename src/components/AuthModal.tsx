import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Settings,
  Database,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut
} from '../services/authService';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  getSupabaseClient
} from '../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface Props {
  currentUser: User | null;
  onClose: () => void;
  onAuthChange: (user: User | null) => void;
}

export const AuthModal: React.FC<Props> = ({ currentUser, onClose, onAuthChange }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'config'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supabase manual credentials config
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseKey(creds.anonKey);

    if (!isConfigured) {
      setMode('config');
    }
  }, [isConfigured]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await signInWithEmail(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg('Signed in successfully! Syncing your inspections...');
      onAuthChange(res.user);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await signUpWithEmail(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(res.message || 'Account created successfully!');
      if (res.user) {
        onAuthChange(res.user);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
    onAuthChange(null);
    setSuccessMsg('You have signed out. App reverted to local storage.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setError('Please enter both Supabase Project URL and Anon API Key.');
      return;
    }

    if (!supabaseUrl.startsWith('https://')) {
      setError('Supabase URL must start with https:// (e.g. https://xyz.supabase.co)');
      return;
    }

    saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
    setSuccessMsg('Supabase credentials saved successfully!');
    setError(null);
    setMode('signin');
  };

  const handleTestConnection = async () => {
    setTestStatus('Testing connection...');
    saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
    const client = getSupabaseClient();
    if (!client) {
      setTestStatus('Failed: Invalid URL or API key format.');
      return;
    }

    try {
      const { error } = await client.from('inspections').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') {
        if (error.message.includes('relation "public.inspections" does not exist')) {
          setTestStatus('Connected to Supabase! (Note: Remember to run supabase-schema.sql to create the inspections table).');
        } else {
          setTestStatus(`Connected! Auth response: ${error.message}`);
        }
      } else {
        setTestStatus('Connection verified! Cloud database is accessible.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus(`Error connecting: ${msg}`);
    }
  };

  return (
    <div className="lightbox-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%', borderRadius: '16px', overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div className="lightbox-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="lightbox-title text-base font-semibold">
                {currentUser ? 'Cloud Account & Team Sync' : 'InspectA4 Cloud Workspace'}
              </h3>
              <p className="lightbox-subtitle text-xs text-slate-400">
                {currentUser
                  ? `Signed in as ${currentUser.email}`
                  : 'Sync inspections across your phone, tablet, and team'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-circle">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div className="auth-status-box auth-status-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-status-box auth-status-success" style={{ marginBottom: '14px' }}>
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current User Logged In Screen */}
          {currentUser ? (
            <div className="auth-form-card">
              <div className="auth-user-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Active Cloud Account</span>
                  <span className="cloud-badge-connected">
                    <span className="cloud-pulse-dot" /> Connected
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} color="#38bdf8" />
                  {currentUser.email}
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  All reports you create or edit will automatically sync with this account and be available on any device you sign in on.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMode('config')}
                  className="btn-cloud-sync"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Settings size={14} /> Database Settings
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="btn-cloud-sync"
                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '6px 14px', fontSize: '12px' }}
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Navigation Tabs for Unauthenticated Mode */}
              <div className="auth-tabs-row">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
                >
                  <LogIn size={13} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                >
                  <UserPlus size={13} /> Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('config'); setError(null); }}
                  className={`auth-tab-btn ${mode === 'config' ? 'active' : ''}`}
                >
                  <Database size={13} /> Cloud Setup
                </button>
              </div>

              {/* Mode: Sign In */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="auth-form-card">
                  <div className="auth-field-group">
                    <label className="auth-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="inspector@agency.com"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-submit-btn"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
                    <span>{loading ? 'Signing in...' : 'Sign In & Sync'}</span>
                  </button>

                  <p style={{ fontSize: '11px', textAlign: 'center', color: '#64748b', margin: 0 }}>
                    Signing in connects your inspections across all your devices and coworkers.
                  </p>
                </form>
              )}

              {/* Mode: Sign Up */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="auth-form-card">
                  <div className="auth-field-group">
                    <label className="auth-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="inspector@agency.com"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-label">Choose Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-submit-btn"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                  </button>

                  <div className="auth-status-box auth-status-info">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <span>Free cloud sync with automated real-time backups & encryption.</span>
                  </div>
                </form>
              )}

              {/* Mode: Cloud Config / Supabase Credentials */}
              {mode === 'config' && (
                <div className="auth-form-card">
                  <div className="auth-status-box auth-status-info">
                    <Database size={16} className="shrink-0 mt-0.5" />
                    <span>
                      Connect your Supabase project URL &amp; Publishable Key to enable multi-device sync, or paste them below to connect immediately!
                    </span>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-label">Supabase Project URL</label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="auth-input"
                      style={{ paddingLeft: '14px', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-label">Supabase Publishable (or Anon) Key</label>
                    <textarea
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="sb_publishable_... or eyJhbGci..."
                      rows={2}
                      className="auth-input-textarea"
                    />
                  </div>

                  {testStatus && (
                    <div className="auth-status-box auth-status-info">
                      <span>{testStatus}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="btn-cloud-sync"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <RefreshCw size={13} /> Test Connection
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="btn-cloud-connect"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <CheckCircle2 size={13} /> Save Credentials
                    </button>
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Don&apos;t have Supabase yet?</span>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Create Free Project <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
