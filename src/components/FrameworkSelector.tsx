/**
 * FrameworkSelector – shows all available frameworks (built-in + custom) and
 * lets the user add new ones via an inline form with validation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Shield, FileCheck, Lock, Activity, Plus, X,
  Loader2, AlertCircle, CheckCircle, LogOut, Boxes,
} from 'lucide-react';
import { FrameworkEntry } from '../types';
import { useAuditContext } from '../data/AuditContext';
import { useAuth } from '../data/AuthContext';
import * as api from '../services/api';

// Icon map for known frameworks; fallback for custom ones
const ICON_MAP: Record<string, React.ElementType> = {
  ITGC:    Shield,
  ITAC:    Activity,
  SOC2:    FileCheck,
  ISO27001: Award,
  HIPAA:   Lock,
};

function FrameworkIcon({ id }: { id: string }) {
  const Icon = ICON_MAP[id] ?? Boxes;
  return <Icon size={28} />;
}

// Simple colour palette for custom framework cards (cycles through)
const CUSTOM_COLOURS = [
  'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
  'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
  'bg-amber-50  text-amber-600  group-hover:bg-amber-600  group-hover:text-white',
  'bg-rose-50   text-rose-600   group-hover:bg-rose-600   group-hover:text-white',
  'bg-cyan-50   text-cyan-600   group-hover:bg-cyan-600   group-hover:text-white',
];

const BUILTIN_COLOUR =
  'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white';

export function FrameworkSelector() {
  const { selectFramework } = useAuditContext();
  const { user, logout } = useAuth();

  // ── state ──────────────────────────────────────────────────────────────────
  const [frameworks, setFrameworks]   = useState<FrameworkEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  // Add-framework form
  const [showForm, setShowForm]         = useState(false);
  const [newName, setNewName]           = useState('');
  const [newDesc, setNewDesc]           = useState('');
  const [formError, setFormError]       = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');

  // ── load frameworks ────────────────────────────────────────────────────────
  const loadFrameworks = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const list = await api.listFrameworks();
      setFrameworks(list);
    } catch (err: any) {
      setFetchError(err.message ?? 'Failed to load frameworks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFrameworks(); }, [loadFrameworks]);

  // ── form validation ────────────────────────────────────────────────────────
  const validateName = (v: string): string => {
    const trimmed = v.trim();
    if (!trimmed) return 'Framework name is required.';
    if (trimmed.length > 30) return 'Name must be 30 characters or fewer.';
    if (!/^[A-Za-z0-9 _\-]+$/.test(trimmed))
      return 'Only letters, digits, spaces, hyphens, and underscores are allowed.';
    const id = trimmed.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (frameworks.some(f => f.id === id))
      return `A framework named "${trimmed}" already exists.`;
    return '';
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleAddFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(newName);
    if (err) { setFormError(err); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const created = await api.createFramework(newName.trim(), newDesc.trim());
      setFrameworks(prev => [...prev, created]);
      setSuccessMsg(`"${created.name}" framework added successfully!`);
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to create framework.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setNewName('');
    setNewDesc('');
    setFormError('');
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">AuditOps</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:block">
              Signed in as <strong>{user.displayName}</strong>
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
        {/* Hero heading */}
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Select a Framework
            </h1>
            <p className="text-slate-500 mt-1.5 text-base">
              Choose an audit framework workspace to continue, or add a custom one.
            </p>
          </div>

          {/* Add Framework button */}
          <button
            onClick={() => { setShowForm(true); setSuccessMsg(''); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl
                       hover:bg-blue-700 active:scale-[.98] transition-all shadow-sm text-sm shrink-0"
          >
            <Plus size={16} />
            Add Framework
          </button>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-xl mb-6 text-sm font-medium">
            <CheckCircle size={17} className="shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Inline Add Framework form */}
        {showForm && (
          <div className="bg-white border border-blue-200 rounded-2xl shadow-md p-7 mb-8 relative">
            <button
              onClick={cancelForm}
              aria-label="Close form"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Add a New Framework</h2>
            <p className="text-slate-500 text-sm mb-6">
              Enter a unique name for your custom audit framework.
            </p>

            <form onSubmit={handleAddFramework} noValidate className="space-y-5 max-w-lg">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Framework Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setFormError(''); }}
                  placeholder="e.g. GDPR, PCI-DSS, NIST"
                  maxLength={30}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition-colors text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">{newName.trim().length}/30 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Brief description of this framework"
                  maxLength={120}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition-colors text-sm"
                />
              </div>

              {/* Inline error */}
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg
                             hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                             text-sm flex items-center gap-2"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? 'Creating…' : 'Create Framework'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Framework grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={36} className="animate-spin text-blue-500" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-slate-600 text-sm">{fetchError}</p>
            <button
              onClick={loadFrameworks}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Built-in section */}
            <section>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Built-in Frameworks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {frameworks.filter(f => f.isBuiltin).map(fw => (
                  <div key={fw.id}>
                    <FrameworkCard
                      fw={fw}
                      iconColour={BUILTIN_COLOUR}
                      onClick={() => selectFramework(fw.id)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Custom section */}
            {frameworks.some(f => !f.isBuiltin) && (
              <section className="mt-10">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Custom Frameworks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {frameworks.filter(f => !f.isBuiltin).map((fw, idx) => (
                    <div key={fw.id}>
                      <FrameworkCard
                        fw={fw}
                        iconColour={CUSTOM_COLOURS[idx % CUSTOM_COLOURS.length]}
                        onClick={() => selectFramework(fw.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {frameworks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                <Boxes size={40} />
                <p className="text-sm">No frameworks yet. Add one above.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-component: single framework card ──────────────────────────────────────
function FrameworkCard({ fw, iconColour, onClick }: {
  fw: FrameworkEntry;
  iconColour: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group bg-white p-7 rounded-xl border border-slate-200 shadow-sm
                 hover:shadow-md hover:border-blue-400 transition-all text-left
                 flex flex-col items-start gap-4 w-full"
    >
      <div className={`p-3 rounded-lg transition-colors ${iconColour}`}>
        <FrameworkIcon id={fw.id} />
      </div>
      <div className="min-w-0 w-full">
        <h3 className="text-lg font-semibold text-slate-900 truncate">{fw.name}</h3>
        <p className="text-slate-500 mt-1 text-sm line-clamp-2">
          {fw.description || 'Custom audit framework'}
        </p>
        {!fw.isBuiltin && (
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] uppercase
                           font-bold tracking-widest bg-violet-100 text-violet-600 border border-violet-200">
            Custom
          </span>
        )}
      </div>
    </button>
  );
}
