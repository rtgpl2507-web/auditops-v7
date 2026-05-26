import React, { useState, useRef } from 'react';
import { useAuditContext } from '../data/AuditContext';
import { AuditControl, ControlStatus } from '../types';
import { getExportUrl, getAISuggestion, createControl, deleteControl, importControls } from '../services/api';
import { AIRefineButton } from './AIRefineButton';
import { EvidenceEmailModal, useEvidenceEmail } from './EvidenceEmailModal';
import {
  Search, Download, Upload, Paperclip, X, File as FileIcon,
  ChevronLeft, ChevronRight, Sparkles, Loader2, ExternalLink, Plus, Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../data/AuthContext';

const EMPTY_FORM: Partial<AuditControl> = {
  srNo: '', controlRefNo: '', domain: '', subDomain: '',
  controlPoint: '', controlDescription: '', documentRequired: '',
  status: 'Not Started', clarification: '', remarks: '',
};

export function Checklist() {
  const { frameworkData, selectedFramework, updateControl, uploadEvidence, deleteEvidence, refreshFramework } = useAuditContext();
  const { user } = useAuth();
  const { analyzing, emailSubject, emailBody, showEmailModal, analyzeRemark, closeEmailModal } = useEvidenceEmail();
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [page, setPage]               = useState(1);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]   = useState<Partial<AuditControl>>(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const itemsPerPage = 10;

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activeControlUpload, setActiveControlUpload] = useState<string | null>(null);

  if (!frameworkData || !selectedFramework) return null;
  const { controls } = frameworkData;

  const domains  = ['All', ...Array.from(new Set(controls.map(c => c.domain)))];
  const statuses = ['All', 'Completed', 'In Progress', 'Pending From Client', 'Not Started'];

  const filteredControls = controls.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      (c.controlPoint.toLowerCase().includes(q) ||
       c.controlDescription.toLowerCase().includes(q) ||
       (c.controlRefNo || '').toLowerCase().includes(q)) &&
      (statusFilter === 'All' || c.status === statusFilter) &&
      (domainFilter === 'All' || c.domain === domainFilter)
    );
  });

  const totalPages       = Math.ceil(filteredControls.length / itemsPerPage);
  const paginatedControls = filteredControls.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const statusColor = (s: ControlStatus) => {
    if (s === 'Completed')           return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'In Progress')         return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'Pending From Client') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  /* ── field helpers ── */
  const setField = <K extends keyof Partial<AuditControl>>(k: K, v: Partial<AuditControl>[K]) =>
    setCreateForm(f => ({ ...f, [k]: v }));

  /* ── event handlers ── */
  const handleStatusChange = (id: string, s: ControlStatus) => updateControl(id, { status: s });

  const handleTextChange = (id: string, field: 'clarification' | 'remarks', v: string) =>
    updateControl(id, { [field]: v });

  const triggerFileUpload = (controlId: string) => {
    setActiveControlUpload(controlId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && activeControlUpload) {
      setUploadingId(activeControlUpload);
      try { await uploadEvidence(activeControlUpload, Array.from(e.target.files)); }
      finally { setUploadingId(null); }
    }
    setActiveControlUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const a = Object.assign(document.createElement('a'), {
      href: getExportUrl(selectedFramework),
      download: `${selectedFramework}_Audit_Checklist.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setImportLoading(true);
    try {
      const r = await importControls(selectedFramework, e.target.files[0]);
      const skippedMsg = r.skipped > 0 ? ` (${r.skipped} rows skipped — missing required fields)` : '';
      alert(`Successfully imported ${r.imported} controls.${skippedMsg} Total in checklist: ${r.total}.`);
      await refreshFramework();
    } catch (err: any) { alert(`Import failed: ${err.message}`); }
    finally { setImportLoading(false); if (importInputRef.current) importInputRef.current.value = ''; }
  };

  const handleAISuggest = async (controlId: string) => {
    setAiLoadingId(controlId);
    try {
      const s = await getAISuggestion(selectedFramework, controlId);
      await updateControl(controlId, { remarks: s });
    } catch (err: any) { alert(`AI suggestion failed: ${err.message}`); }
    finally { setAiLoadingId(null); }
  };

  const handleDeleteControl = async (controlId: string, point: string) => {
    if (!window.confirm(`Remove "${point}" from the checklist? This cannot be undone.`)) return;
    setDeletingId(controlId);
    try { await deleteControl(selectedFramework, controlId); await refreshFramework(); }
    catch (err: any) { alert(`Failed to delete: ${err.message}`); }
    finally { setDeletingId(null); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.controlPoint?.trim()) return;
    setCreateLoading(true);
    try {
      await createControl(selectedFramework, createForm);
      await refreshFramework();
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
    } catch (err: any) { alert(`Failed to create task: ${err.message}`); }
    finally { setCreateLoading(false); }
  };

  /* ── AI refine context string for the modal ── */
  const refineCtx = [
    selectedFramework && `Framework: ${selectedFramework}`,
    createForm.domain && `Domain: ${createForm.domain}`,
    createForm.subDomain && `Sub-domain: ${createForm.subDomain}`,
    createForm.controlPoint && `Control: ${createForm.controlPoint}`,
  ].filter(Boolean).join(', ');

  /* ════════════════════════════════════════════════════════════ render ══ */
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)]">

      {/* ── toolbar ── */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text" placeholder="Search controls or ref no…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <select value={domainFilter} onChange={e => { setDomainFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {domains.map(d => <option key={d}>{d}</option>)}
          </select>

          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>

          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0">
            <Plus size={16} /> Create Checklist Task
          </button>

          <input type="file" accept=".csv" className="hidden" ref={importInputRef} onChange={handleImportFile} />
          <button onClick={() => importInputRef.current?.click()} disabled={importLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0 disabled:opacity-50">
            {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import CSV
          </button>

          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shrink-0">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange}
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.zip,.txt,.csv" />

      {/* ── table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1700px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-12"></th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Sr. No.</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">Control Ref No.</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Domain</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-56">Control Point</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-64">Control Description</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-44">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-64">Evidence</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Clarification / Remarks
                  <span title="AI auto-detects evidence issues in remarks and generates an email template" className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold normal-case tracking-normal">
                    <Mail size={10} /> AI Watch
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedControls.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No controls found matching your filters.</td></tr>
            )}
            {paginatedControls.map(ctrl => (
              <tr key={ctrl.id} className="hover:bg-slate-50/50 align-top transition-colors">
                <td className="px-4 py-4 text-center">
                  <button onClick={() => handleDeleteControl(ctrl.id, ctrl.controlPoint)}
                    disabled={deletingId === ctrl.id} title="Remove"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-40">
                    {deletingId === ctrl.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-slate-900">{ctrl.srNo}</td>
                <td className="px-4 py-4 text-sm font-medium text-blue-700">{ctrl.controlRefNo || '—'}</td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">{ctrl.domain}</div>
                  <div className="text-xs text-slate-500 mt-1">{ctrl.subDomain}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-900 font-medium">{ctrl.controlPoint}</div>
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-2">📎 {ctrl.documentRequired}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-600 leading-relaxed">
                    {ctrl.controlDescription || <span className="text-slate-300 italic">—</span>}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <select value={ctrl.status} onChange={e => handleStatusChange(ctrl.id, e.target.value as ControlStatus)}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-full border outline-none appearance-none cursor-pointer w-full max-w-[180px]', statusColor(ctrl.status))}>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending From Client">Pending From Client</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-2">Updated {format(new Date(ctrl.updatedAt), 'MMM d')}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1.5 mb-2">
                    {ctrl.evidence.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded text-xs gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileIcon size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-700">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors">
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button onClick={() => deleteEvidence(ctrl.id, f.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => triggerFileUpload(ctrl.id)} disabled={uploadingId === ctrl.id}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-2 rounded border border-dashed border-slate-300 transition-colors w-full justify-center disabled:opacity-50">
                    {uploadingId === ctrl.id ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Paperclip size={13} /> Attach Evidence</>}
                  </button>
                </td>
                <td className="px-4 py-4 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Clarification</label>
                    <textarea className="w-full text-xs text-slate-700 p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={2} placeholder="Add clarification notes…"
                      value={ctrl.clarification}
                      onChange={e => handleTextChange(ctrl.id, 'clarification', e.target.value)}
                      onBlur={e => updateControl(ctrl.id, { clarification: e.target.value })} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Auditor Remarks</label>
                      <div className="flex items-center gap-1.5">
                        {analyzing && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600">
                            <Loader2 size={10} className="animate-spin" /> Checking…
                          </span>
                        )}
                        <button onClick={() => handleAISuggest(ctrl.id)} disabled={aiLoadingId === ctrl.id}
                          className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors disabled:opacity-50">
                          {aiLoadingId === ctrl.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          AI Suggest
                        </button>
                      </div>
                    </div>
                    <textarea className="w-full text-xs text-slate-700 p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={2} placeholder="Add auditor remarks…"
                      value={ctrl.remarks}
                      onChange={e => handleTextChange(ctrl.id, 'remarks', e.target.value)}
                      onBlur={e => {
                        const val = e.target.value;
                        updateControl(ctrl.id, { remarks: val });
                        // Always analyse — AI decides if remark signals an evidence issue
                        if (val.trim()) {
                          analyzeRemark(val, {
                            type: 'checklist',
                            framework: selectedFramework!,
                            srNo: ctrl.srNo,
                            title: ctrl.controlPoint,
                            domain: ctrl.domain,
                            documentRequired: ctrl.documentRequired,
                            evidenceFiles: ctrl.evidence.map(f => f.name),
                            auditorName: user?.displayName ?? 'Auditor',
                          });
                        }
                      }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── pagination ── */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-white rounded-b-xl">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">
            {filteredControls.length === 0 ? 0 : Math.min(filteredControls.length, (page - 1) * itemsPerPage + 1)}
          </span> to <span className="font-medium text-slate-900">
            {Math.min(filteredControls.length, page * itemsPerPage)}
          </span> of <span className="font-medium text-slate-900">{filteredControls.length}</span> controls
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-medium text-slate-900 px-2 text-center min-w-[3rem]">
            {page} / {Math.max(1, totalPages)}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════ Create Checklist Task Modal ══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

            {/* modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create Checklist Task</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Add a new audit control to the <strong>{selectedFramework}</strong> checklist
                </p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_FORM); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* AI Refine notice */}
            <div className="mx-6 mt-5 flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <Sparkles size={16} className="text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 leading-relaxed">
                <span className="font-semibold">AI Refine</span> is available on every text field.
                Type your raw notes, then click <span className="font-semibold">✨ AI Refine</span> to instantly polish them into professional audit language.
              </p>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-5">

              {/* Sr. No. + Ref No */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sr. No.</label>
                  <input type="text" value={createForm.srNo || ''}
                    onChange={e => setField('srNo', e.target.value)}
                    placeholder={`${selectedFramework}-${String(controls.length + 1).padStart(3, '0')}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Control Reference No.</label>
                  <input type="text" value={createForm.controlRefNo || ''}
                    onChange={e => setField('controlRefNo', e.target.value)}
                    placeholder={`${selectedFramework}-REF-${String(controls.length + 1).padStart(3, '0')}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Domain + Sub-Domain */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Domain <span className="text-red-500">*</span></label>
                  <input type="text" required value={createForm.domain || ''}
                    onChange={e => setField('domain', e.target.value)}
                    placeholder="e.g. Access Management"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sub-Domain</label>
                  <input type="text" value={createForm.subDomain || ''}
                    onChange={e => setField('subDomain', e.target.value)}
                    placeholder="e.g. User Provisioning"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Control Point */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Control Point <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={createForm.controlPoint || ''}
                  onChange={e => setField('controlPoint', e.target.value)}
                  placeholder="Brief control title…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Control Description + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Control Description</label>
                  <AIRefineButton
                    value={createForm.controlDescription || ''}
                    fieldLabel="Control Description"
                    context={refineCtx}
                    onRefined={v => setField('controlDescription', v)}
                  />
                </div>
                <textarea rows={3} value={createForm.controlDescription || ''}
                  onChange={e => setField('controlDescription', e.target.value)}
                  placeholder="Describe the control in detail…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Document Required + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Document Required</label>
                  <AIRefineButton
                    value={createForm.documentRequired || ''}
                    fieldLabel="Document Required"
                    context={refineCtx}
                    onRefined={v => setField('documentRequired', v)}
                  />
                </div>
                <input type="text" value={createForm.documentRequired || ''}
                  onChange={e => setField('documentRequired', e.target.value)}
                  placeholder="e.g. Policy document, access logs, screenshots"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                <select value={createForm.status || 'Not Started'}
                  onChange={e => setField('status', e.target.value as ControlStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending From Client">Pending From Client</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Clarification + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Clarification</label>
                  <AIRefineButton
                    value={createForm.clarification || ''}
                    fieldLabel="Clarification"
                    context={refineCtx}
                    onRefined={v => setField('clarification', v)}
                  />
                </div>
                <textarea rows={2} value={createForm.clarification || ''}
                  onChange={e => setField('clarification', e.target.value)}
                  placeholder="Clarification notes…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Auditor Remarks + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Auditor Remarks</label>
                  <AIRefineButton
                    value={createForm.remarks || ''}
                    fieldLabel="Auditor Remarks"
                    context={refineCtx}
                    onRefined={v => setField('remarks', v)}
                  />
                </div>
                <textarea rows={2} value={createForm.remarks || ''}
                  onChange={e => setField('remarks', e.target.value)}
                  placeholder="Auditor remarks…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button"
                  onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_FORM); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {createLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Evidence Issue Email Modal ── */}
      {showEmailModal && emailSubject && emailBody && (
        <EvidenceEmailModal
          subject={emailSubject}
          body={emailBody}
          onClose={closeEmailModal}
        />
      )}
    </div>
  );
}
