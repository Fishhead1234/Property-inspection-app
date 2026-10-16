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
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current User Logged In Screen */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Active Account</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Mail size={16} className="text-blue-400" />
                  {currentUser.email}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  All reports you create or edit will automatically sync with this account and be available on any device you sign in on.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMode('config')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Settings size={14} /> Database Settings
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 transition-all flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Navigation Tabs for Unauthenticated Mode */}
              <div className="flex rounded-lg bg-slate-900/80 p-1 mb-5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'signin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn size={13} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'signup' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus size={13} /> Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('config'); setError(null); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'config' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database size={13} /> Cloud Setup
                </button>
              </div>

              {/* Mode: Sign In */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="inspector@agency.com"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
                    {loading ? 'Signing in...' : 'Sign In & Sync'}
                  </button>

                  <p className="text-[11px] text-center text-slate-400">
                    Signing in connects your inspections across all your devices and coworkers.
                  </p>
                </form>
              )}

              {/* Mode: Sign Up */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="inspector@agency.com"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Free cloud sync with automated real-time backups & encryption.</span>
                  </div>
                </form>
              )}

              {/* Mode: Cloud Config / Supabase Credentials */}
              {mode === 'config' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-start gap-2">
                    <Database size={16} className="shrink-0 mt-0.5 text-blue-400" />
                    <span>
                      Connect your Supabase project URL & Anon Key to enable multi-device sync, or paste them below to test immediately!
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Supabase Anon Public API Key
                    </label>
                    <textarea
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      rows={2}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {testStatus && (
                    <div className="text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200">
                      {testStatus}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <RefreshCw size={13} /> Test Connection
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={13} /> Save Credentials
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Don&apos;t have Supabase yet?</span>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-medium"
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
