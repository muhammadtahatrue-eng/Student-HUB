import React, { useState } from 'react';
import {
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Server,
  HardDrive
} from 'lucide-react';
import { SupabaseConfig } from '../types/index.ts';
import { testSupabaseConnection, saveSupabaseConfig } from '../lib/supabaseClient.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onConfigChange: (newConfig: SupabaseConfig) => void;
  onOpenCodeDrawer: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onOpenCodeDrawer,
}) => {
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setTestResult({
        success: false,
        message: 'Please enter both Supabase Project URL and Public Anon Key.'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      const updated: SupabaseConfig = {
        ...config,
        url: url.trim(),
        anonKey: anonKey.trim(),
        isConnected: true,
        lastTestedAt: new Date().toISOString()
      };
      saveSupabaseConfig(updated);
      onConfigChange(updated);
    }
  };

  const handleSave = () => {
    const updated: SupabaseConfig = {
      ...config,
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: Boolean(url.trim() && anonKey.trim()),
      lastTestedAt: new Date().toISOString()
    };
    saveSupabaseConfig(updated);
    onConfigChange(updated);
    onClose();
  };

  const handleResetToDemo = () => {
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    const updated: SupabaseConfig = {
      url: '',
      anonKey: '',
      storageBucket: 'study-materials',
      isConnected: false,
      lastTestedAt: null
    };
    saveSupabaseConfig(updated);
    onConfigChange(updated);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <header className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Supabase Connection Setup
              </h2>
              <p className="text-xs text-stone-500">
                PostgreSQL database, Storage bucket, and Auth configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status Alert */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            config.isConnected
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-stone-50 border-stone-200 text-stone-700'
          }`}>
            {config.isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <Server className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold mb-0.5">
                {config.isConnected ? 'Connected to Live Supabase' : 'Running in Offline / Demo Mode'}
              </p>
              <p className="leading-relaxed text-stone-600">
                {config.isConnected
                  ? 'Your applet is reading notes and uploading files directly to your live Supabase database and storage bucket.'
                  : 'Currently storing notes in browser localStorage with realistic pre-seeded study guides. Enter your credentials below to connect to your live project.'}
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-900 font-mono"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Found in your Supabase Dashboard → Settings → API → Project URL
              </span>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Supabase Public Anon Key
              </label>
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-900 font-mono"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Found in your Supabase Dashboard → Settings → API → Project API Keys (anon public)
              </span>
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div className={`p-3 rounded-lg border flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Storage Bucket Specifications */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-stone-500" />
                Required Storage Bucket
              </span>
              <span className="font-mono text-indigo-950 font-bold bg-white px-2 py-0.5 rounded border border-stone-200">
                study-materials
              </span>
            </div>
            <p className="text-stone-500 leading-relaxed text-[11px]">
              Set bucket as <strong>Public</strong> with a 25MB file limit for <code className="font-mono">application/pdf</code>.
            </p>
          </div>

          {/* SQL Migration Quick link */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-stone-600">Need the SQL schema to create tables?</span>
            <button
              onClick={() => {
                onClose();
                onOpenCodeDrawer();
              }}
              className="text-indigo-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              View SQL Migration Script
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            onClick={handleResetToDemo}
            className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
          >
            Switch to Demo Mode
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing || !url || !anonKey}
              className="px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-950 hover:bg-indigo-900 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Save & Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
