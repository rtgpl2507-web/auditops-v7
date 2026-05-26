import React, { useState, useRef } from 'react';
import { useTaskContext } from '../data/TaskContext';
import { useAuditContext } from '../data/AuditContext';
import { Task, TaskStatus } from '../types';
import { getTaskExportUrl, importTasks } from '../services/api';
import { AIRefineButton } from './AIRefineButton';
import { EvidenceEmailModal, useEvidenceEmail } from './EvidenceEmailModal';
import {
  Search, Download, Upload, Plus, X, File as FileIcon, ExternalLink,
  ChevronLeft, ChevronRight, Loader2, Paperclip, Sparkles, Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../data/AuthContext';

const EMPTY_FORM: Partial<Task> = {
  srNo: '', taskName: '', taskDescription: '', status: 'Not Started', remarks: '',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress':  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Completed':    'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export function Tasks() {
  const { tasks, loading, addTask, editTask, removeTask, uploadDoc, removeDoc, refreshTasks } = useTaskContext();
  const { selectedFramework } = useAuditContext();
  const { user } = useAuth();
  const { analyzing, emailSubject, emailBody, showEmailModal, analyzeRemark, closeEmailModal } = useEvidenceEmail();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage]               = useState(1);
  const itemsPerPage = 10;

  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<Partial<Task>>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  if (!selectedFramework) return null;

  const setField = <K extends keyof Partial<Task>>(k: K, v: Partial<Task>[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    return (t.taskName.toLowerCase().includes(q) || t.taskDescription.toLowerCase().includes(q))
      && (statusFilter === 'All' || t.status === statusFilter);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated  = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.taskName?.trim()) return;
    setSaving(true);
    try {
      await addTask({ ...form, srNo: form.srNo || `T-${String(tasks.length + 1).padStart(3, '0')}` });
      setShowModal(false); setForm(EMPTY_FORM);
    } catch (err: any) { alert(`Failed: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (taskId: string, name: string) => {
    if (!window.confirm(`Remove task "${name}"? This cannot be undone.`)) return;
    setDeletingId(taskId);
    try { await removeTask(taskId); } catch (err: any) { alert(`Failed: ${err.message}`); }
    finally { setDeletingId(null); }
  };

  const triggerUpload = (taskId: string) => {
    setActiveUploadId(taskId); fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !activeUploadId) return;
    setUploadingId(activeUploadId);
    try { await uploadDoc(activeUploadId, Array.from(e.target.files)); }
    catch (err: any) { alert(`Upload failed: ${err.message}`); }
    finally { setUploadingId(null); setActiveUploadId(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleExport = () => {
    const a = Object.assign(document.createElement('a'), {
      href: getTaskExportUrl(selectedFramework),
      download: `${selectedFramework}_Tasks.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setImportLoading(true);
    try {
      const r = await importTasks(selectedFramework, e.target.files[0]);
      alert(`Imported ${r.imported} tasks. Total: ${r.total}.`);
      await refreshTasks();
    } catch (err: any) { alert(`Import failed: ${err.message}`); }
    finally { setImportLoading(false); if (importRef.current) importRef.current.value = ''; }
  };

  /* AI refine context for the modal */
  const refineCtx = [
    `Framework: ${selectedFramework}`,
    form.taskName && `Task: ${form.taskName}`,
  ].filter(Boolean).join(', ');

  /* ═══════════════════════════════════════════════════════ render ══ */
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)]">

      {/* ── toolbar ── */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search tasks…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {['All', 'Not Started', 'In Progress', 'Completed'].map(s => <option key={s}>{s}</option>)}
          </select>

          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Add Task
          </button>

          <input type="file" accept=".csv" className="hidden" ref={importRef} onChange={handleImport} />
          <button onClick={() => importRef.current?.click()} disabled={importLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import CSV
          </button>

          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <input type="file" multiple className="hidden" ref={fileRef} onChange={handleFileChange}
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.zip,.txt,.csv" />

      {/* ── table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-10"></th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Sr No</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-48">Task Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Task Description</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-44">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-56">Upload Document</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-56">
                <span className="flex items-center gap-1.5">
                  Remarks
                  <span title="AI auto-detects evidence issues in remarks and generates an email template" className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold normal-case tracking-normal">
                    <Mail size={10} /> AI Watch
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={7} className="text-center py-10">
                <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
              </td></tr>
            )}
            {!loading && paginated.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                {tasks.length === 0 ? 'No tasks yet. Click "Add Task" to get started.' : 'No tasks match your filters.'}
              </td></tr>
            )}
            {paginated.map(task => (
              <tr key={task.id} className="hover:bg-slate-50/50 align-top transition-colors">
                <td className="px-4 py-4 text-center">
                  <button onClick={() => handleDelete(task.id, task.taskName)} disabled={deletingId === task.id}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-40">
                    {deletingId === task.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-slate-700">{task.srNo}</td>
                <td className="px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{task.taskName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Updated {format(new Date(task.updatedAt), 'MMM d')}</div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600 leading-relaxed">
                  {task.taskDescription || <span className="text-slate-300 italic">—</span>}
                </td>
                <td className="px-4 py-4">
                  <select value={task.status}
                    onChange={e => editTask(task.id, { status: e.target.value as TaskStatus })}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-full border outline-none appearance-none cursor-pointer w-full max-w-[160px]', STATUS_COLORS[task.status])}>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1.5 mb-2">
                    {task.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded text-xs gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileIcon size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-700">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors">
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button onClick={() => removeDoc(task.id, doc.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => triggerUpload(task.id)} disabled={uploadingId === task.id}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-2 rounded border border-dashed border-slate-300 transition-colors w-full justify-center disabled:opacity-50">
                    {uploadingId === task.id
                      ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                      : <><Paperclip size={13} /> Attach Document</>}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1.5">
                    {analyzing && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-1">
                        <Loader2 size={10} className="animate-spin" /> Checking remark…
                      </div>
                    )}
                    <textarea className="w-full text-xs text-slate-700 p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={3} placeholder="Add remarks…"
                      defaultValue={task.remarks}
                      onBlur={e => {
                        const val = e.target.value;
                        editTask(task.id, { remarks: val });
                        // Always analyse — AI decides if remark signals an evidence issue
                        if (val.trim()) {
                          analyzeRemark(val, {
                            type: 'task',
                            framework: selectedFramework!,
                            srNo: task.srNo,
                            title: task.taskName,
                            evidenceFiles: task.documents.map(d => d.name),
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
          Showing <span className="font-medium text-slate-900">{filtered.length === 0 ? 0 : (page - 1) * itemsPerPage + 1}</span>{' '}
          to <span className="font-medium text-slate-900">{Math.min(filtered.length, page * itemsPerPage)}</span>{' '}
          of <span className="font-medium text-slate-900">{filtered.length}</span> tasks
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-medium text-slate-900 px-2 min-w-[3rem] text-center">
            {page} / {Math.max(1, totalPages)}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════ Add Task Modal ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

            {/* modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add Task</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Add a new task to the <strong>{selectedFramework}</strong> task list
                </p>
              </div>
              <button onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* AI Refine notice */}
            <div className="mx-6 mt-5 flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <Sparkles size={16} className="text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 leading-relaxed">
                <span className="font-semibold">AI Refine</span> is available on every text field.
                Type your rough notes first, then click <span className="font-semibold">✨ AI Refine</span> to transform them into polished professional language instantly.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">

              {/* Sr No */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sr No</label>
                <input type="text" value={form.srNo || ''}
                  onChange={e => setField('srNo', e.target.value)}
                  placeholder={`T-${String(tasks.length + 1).padStart(3, '0')}`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Task Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={form.taskName || ''}
                  onChange={e => setField('taskName', e.target.value)}
                  placeholder="Enter task name…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Task Description + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Task Description
                  </label>
                  <AIRefineButton
                    value={form.taskDescription || ''}
                    fieldLabel="Task Description"
                    context={refineCtx}
                    onRefined={v => setField('taskDescription', v)}
                  />
                </div>
                <textarea rows={3} value={form.taskDescription || ''}
                  onChange={e => setField('taskDescription', e.target.value)}
                  placeholder="Describe the task in detail…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                <select value={form.status || 'Not Started'}
                  onChange={e => setField('status', e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>

              {/* Remarks + AI Refine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks</label>
                  <AIRefineButton
                    value={form.remarks || ''}
                    fieldLabel="Remarks"
                    context={refineCtx}
                    onRefined={v => setField('remarks', v)}
                  />
                </div>
                <textarea rows={2} value={form.remarks || ''}
                  onChange={e => setField('remarks', e.target.value)}
                  placeholder="Any initial remarks…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add Task
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
