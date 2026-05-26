import { useAuditContext } from '../data/AuditContext';
import { useTaskContext } from '../data/TaskContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { CheckCircle2, Clock, AlertCircle, ListTodo, ClipboardList, FileDown, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

const CTRL_COLORS: Record<string, string> = {
  'Completed': '#22c55e',
  'In Progress': '#eab308',
  'Pending From Client': '#ef4444',
  'Not Started': '#94a3b8',
};
const TASK_COLORS: Record<string, string> = {
  'Completed': '#22c55e',
  'In Progress': '#3b82f6',
  'Not Started': '#94a3b8',
};

function generateReportHTML(
  framework: string, controls: any[], tasks: any[],
  cPct: number, tPct: number,
  cDone: number, cProgress: number, cPending: number, cNot: number,
  tDone: number, tProgress: number, tNot: number
) {
  const now = new Date();
  const domainData: Record<string, any> = {};
  controls.forEach(c => {
    if (!domainData[c.domain]) domainData[c.domain] = { total: 0, completed: 0, inProgress: 0, pending: 0 };
    domainData[c.domain].total++;
    if (c.status === 'Completed') domainData[c.domain].completed++;
    else if (c.status === 'In Progress') domainData[c.domain].inProgress++;
    else if (c.status === 'Pending From Client') domainData[c.domain].pending++;
  });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${framework} Audit Report</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; padding:40px; }
.header { border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:28px; }
.header h1 { font-size:26px; color:#1e3a8a; }
.meta { font-size:12px; color:#64748b; margin-top:8px; display:flex; gap:24px; }
.section { margin-bottom:28px; }
.section h2 { font-size:16px; font-weight:600; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:14px; }
.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
.kpi { padding:16px; border-radius:10px; border:1px solid #e2e8f0; }
.kpi .label { font-size:11px; color:#64748b; margin-bottom:4px; }
.kpi .value { font-size:24px; font-weight:700; }
.kpi.blue .value{color:#2563eb} .kpi.green .value{color:#16a34a}
.kpi.yellow .value{color:#ca8a04} .kpi.red .value{color:#dc2626}
.pbar { width:100%; height:12px; background:#f1f5f9; border-radius:99px; overflow:hidden; display:flex; margin:8px 0; }
.pbar-seg { height:100%; }
table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
th { background:#f8fafc; text-align:left; padding:9px 12px; font-size:11px; text-transform:uppercase; color:#64748b; border-bottom:2px solid #e2e8f0; }
td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
.badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
.c { background:#dcfce7; color:#16a34a; } .ip { background:#fef9c3; color:#a16207; }
.pfc { background:#fee2e2; color:#dc2626; } .ns { background:#f1f5f9; color:#475569; }
.footer { margin-top:36px; border-top:1px solid #e2e8f0; padding-top:14px; font-size:11px; color:#94a3b8; text-align:center; }
.dual { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
</style></head><body>
<div class="header">
  <h1>AuditOps — ${framework} Comprehensive Report</h1>
  <div class="meta">
    <span>Framework: <strong>${framework}</strong></span>
    <span>Generated: <strong>${format(now, 'dd MMM yyyy, HH:mm')}</strong></span>
    <span>Controls: <strong>${controls.length}</strong></span>
    <span>Tasks: <strong>${tasks.length}</strong></span>
  </div>
</div>

<div class="section">
  <h2>Checklist Progress — ${cPct}% Complete</h2>
  <div class="kpi-grid">
    <div class="kpi blue"><div class="label">Completion</div><div class="value">${cPct}%</div></div>
    <div class="kpi green"><div class="label">Completed</div><div class="value">${cDone}</div></div>
    <div class="kpi yellow"><div class="label">In Progress</div><div class="value">${cProgress}</div></div>
    <div class="kpi red"><div class="label">Pending From Client</div><div class="value">${cPending}</div></div>
  </div>
  <div class="pbar">
    <div class="pbar-seg" style="width:${controls.length>0?(cDone/controls.length)*100:0}%;background:#22c55e"></div>
    <div class="pbar-seg" style="width:${controls.length>0?(cProgress/controls.length)*100:0}%;background:#eab308"></div>
    <div class="pbar-seg" style="width:${controls.length>0?(cPending/controls.length)*100:0}%;background:#ef4444"></div>
    <div class="pbar-seg" style="width:${controls.length>0?(cNot/controls.length)*100:0}%;background:#94a3b8"></div>
  </div>
  <div style="font-size:11px;color:#64748b;display:flex;gap:16px;margin-top:4px;">
    <span>🟢 Completed: ${cDone}</span><span>🟡 In Progress: ${cProgress}</span>
    <span>🔴 Pending: ${cPending}</span><span>⬜ Not Started: ${cNot}</span>
  </div>
</div>

<div class="section">
  <h2>Task Progress — ${tPct}% Complete</h2>
  <div class="kpi-grid">
    <div class="kpi blue"><div class="label">Completion</div><div class="value">${tPct}%</div></div>
    <div class="kpi green"><div class="label">Completed</div><div class="value">${tDone}</div></div>
    <div class="kpi yellow"><div class="label">In Progress</div><div class="value">${tProgress}</div></div>
    <div class="kpi ns"><div class="label">Not Started</div><div class="value">${tNot}</div></div>
  </div>
  <div class="pbar">
    <div class="pbar-seg" style="width:${tasks.length>0?(tDone/tasks.length)*100:0}%;background:#22c55e"></div>
    <div class="pbar-seg" style="width:${tasks.length>0?(tProgress/tasks.length)*100:0}%;background:#3b82f6"></div>
    <div class="pbar-seg" style="width:${tasks.length>0?(tNot/tasks.length)*100:0}%;background:#94a3b8"></div>
  </div>
</div>

<div class="section">
  <h2>Domain-wise Checklist Progress</h2>
  <table>
    <thead><tr><th>Domain</th><th>Total</th><th>Completed</th><th>In Progress</th><th>Pending</th><th>% Done</th></tr></thead>
    <tbody>
      ${Object.entries(domainData).map(([d, v]: [string, any]) =>
        `<tr><td><strong>${d}</strong></td><td>${v.total}</td>
        <td style="color:#16a34a;font-weight:600">${v.completed}</td>
        <td style="color:#ca8a04;font-weight:600">${v.inProgress}</td>
        <td style="color:#dc2626;font-weight:600">${v.pending}</td>
        <td><strong>${v.total>0?Math.round((v.completed/v.total)*100):0}%</strong></td></tr>`
      ).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Control Details</h2>
  <table>
    <thead><tr><th>Sr No</th><th>Ref No</th><th>Domain</th><th>Control Point</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>
      ${controls.map(c => {
        const cls = c.status==='Completed'?'c':c.status==='In Progress'?'ip':c.status==='Pending From Client'?'pfc':'ns';
        return `<tr><td>${c.srNo}</td><td>${c.controlRefNo||'—'}</td><td>${c.domain}</td><td>${c.controlPoint}</td>
          <td><span class="badge ${cls}">${c.status}</span></td>
          <td>${format(new Date(c.updatedAt),'dd MMM yyyy')}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

${tasks.length > 0 ? `
<div class="section">
  <h2>Task Details</h2>
  <table>
    <thead><tr><th>Sr No</th><th>Task Name</th><th>Description</th><th>Status</th><th>Docs</th><th>Updated</th></tr></thead>
    <tbody>
      ${tasks.map(t => {
        const cls = t.status==='Completed'?'c':t.status==='In Progress'?'ip':'ns';
        return `<tr><td>${t.srNo}</td><td><strong>${t.taskName}</strong></td><td>${t.taskDescription||'—'}</td>
          <td><span class="badge ${cls}">${t.status}</span></td>
          <td>${t.documents.length}</td>
          <td>${format(new Date(t.updatedAt),'dd MMM yyyy')}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">AuditOps — Confidential Report &bull; ${format(now,'PPpp')} &bull; ${framework}</div>
</body></html>`;
}

export function Dashboard() {
  const { frameworkData } = useAuditContext();
  const { tasks } = useTaskContext();

  if (!frameworkData) return null;
  const { controls, activity, framework } = frameworkData;

  const total = controls.length;
  const cDone = controls.filter(c => c.status === 'Completed').length;
  const cProgress = controls.filter(c => c.status === 'In Progress').length;
  const cPending = controls.filter(c => c.status === 'Pending From Client').length;
  const cNot = controls.filter(c => c.status === 'Not Started').length;
  const cPct = total > 0 ? Math.round((cDone / total) * 100) : 0;

  const tTotal = tasks.length;
  const tDone = tasks.filter(t => t.status === 'Completed').length;
  const tProgress = tasks.filter(t => t.status === 'In Progress').length;
  const tNot = tasks.filter(t => t.status === 'Not Started').length;
  const tPct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;

  const ctrlPieData = [
    { name: 'Completed', value: cDone },
    { name: 'In Progress', value: cProgress },
    { name: 'Pending', value: cPending },
    { name: 'Not Started', value: cNot },
  ].filter(d => d.value > 0);

  const taskPieData = [
    { name: 'Completed', value: tDone },
    { name: 'In Progress', value: tProgress },
    { name: 'Not Started', value: tNot },
  ].filter(d => d.value > 0);

  const domainData = controls.reduce((acc, c) => {
    if (!acc[c.domain]) acc[c.domain] = { name: c.domain, total: 0, completed: 0, pending: 0, inProgress: 0 };
    acc[c.domain].total++;
    if (c.status === 'Completed') acc[c.domain].completed++;
    if (c.status === 'Pending From Client') acc[c.domain].pending++;
    if (c.status === 'In Progress') acc[c.domain].inProgress++;
    return acc;
  }, {} as Record<string, any>);
  const barData = Object.values(domainData);

  const handleDownloadReport = () => {
    const html = generateReportHTML(
      framework, controls, tasks, cPct, tPct,
      cDone, cProgress, cPending, cNot, tDone, tProgress, tNot
    );
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.addEventListener('load', () => setTimeout(() => win.print(), 500));
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-6">

      {/* ── Checklist KPIs ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <CheckSquare size={14} /> Checklist Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Completion</p><h3 className="text-2xl font-bold text-blue-600 mt-1">{cPct}%</h3></div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><ListTodo size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Completed</p><h3 className="text-2xl font-bold text-emerald-600 mt-1">{cDone}</h3></div>
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">In Progress</p><h3 className="text-2xl font-bold text-yellow-600 mt-1">{cProgress}</h3></div>
            <div className="h-12 w-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600"><Clock size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Pending From Client</p><h3 className="text-2xl font-bold text-red-600 mt-1">{cPending}</h3></div>
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600"><AlertCircle size={24} /></div>
          </div>
        </div>
      </div>

      {/* ── Task KPIs ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <ClipboardList size={14} /> Task Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Task Completion</p><h3 className="text-2xl font-bold text-blue-600 mt-1">{tPct}%</h3></div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><ClipboardList size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Tasks Completed</p><h3 className="text-2xl font-bold text-emerald-600 mt-1">{tDone}</h3></div>
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Tasks In Progress</p><h3 className="text-2xl font-bold text-blue-500 mt-1">{tProgress}</h3></div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><Clock size={24} /></div>
          </div>
        </div>
      </div>

      {/* ── Combined Progress Bars + Download ── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-slate-700">Combined Audit Progress</span>
          <button onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <FileDown size={16} /> Download Report
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Checklist ({cDone}/{total} controls)</span>
              <span className="font-semibold text-slate-700">{cPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              <div className="bg-emerald-500 h-2.5" style={{ width: `${total>0?(cDone/total)*100:0}%` }} />
              <div className="bg-yellow-400 h-2.5" style={{ width: `${total>0?(cProgress/total)*100:0}%` }} />
              <div className="bg-red-500 h-2.5" style={{ width: `${total>0?(cPending/total)*100:0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Tasks ({tDone}/{tTotal} tasks)</span>
              <span className="font-semibold text-slate-700">{tPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              <div className="bg-emerald-500 h-2.5" style={{ width: `${tTotal>0?(tDone/tTotal)*100:0}%` }} />
              <div className="bg-blue-500 h-2.5" style={{ width: `${tTotal>0?(tProgress/tTotal)*100:0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Checklist Status</h3>
          {ctrlPieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ctrlPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {ctrlPieData.map((e, i) => <Cell key={i} fill={CTRL_COLORS[e.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip /><Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Task Status</h3>
          {taskPieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No tasks yet</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {taskPieData.map((e, i) => <Cell key={i} fill={TASK_COLORS[e.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip /><Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Domain Progress</h3>
          {barData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Legend />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" />
                  <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#eab308" />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No activity yet. Start by updating controls or tasks.</p>
        ) : (
          <div className="space-y-4">
            {activity.slice(0, 8).map(act => (
              <div key={act.id} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{act.action}</p>
                  {act.controlPoint && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.controlPoint}</p>}
                  <p className="text-xs text-slate-400 mt-1">{format(new Date(act.timestamp), 'MMM d, yyyy HH:mm')} • {act.user}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
