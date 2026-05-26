import { FrameworkType, FrameworkData, AuditControl, EvidenceFile } from '../types';

const BASE = '/api';

async function handleResponse<T>(res: globalThis.Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Frameworks ────────────────────────────────────────────────────────────────

export async function fetchFramework(framework: FrameworkType): Promise<FrameworkData> {
  const res = await fetch(`${BASE}/frameworks/${framework}`);
  return handleResponse<FrameworkData>(res);
}

export async function updateControl(
  framework: FrameworkType,
  controlId: string,
  updates: Partial<AuditControl>
): Promise<AuditControl> {
  const res = await fetch(`${BASE}/frameworks/${framework}/controls/${controlId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<AuditControl>(res);
}

export async function uploadEvidence(
  framework: FrameworkType,
  controlId: string,
  files: File[]
): Promise<{ evidence: EvidenceFile[] }> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(`${BASE}/frameworks/${framework}/controls/${controlId}/evidence`, {
    method: 'POST',
    body: form,
  });
  return handleResponse<{ evidence: EvidenceFile[] }>(res);
}

export async function deleteEvidence(
  framework: FrameworkType,
  controlId: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `${BASE}/frameworks/${framework}/controls/${controlId}/evidence/${fileId}`,
    { method: 'DELETE' }
  );
  return handleResponse<void>(res);
}

export function getExportUrl(framework: FrameworkType): string {
  return `${BASE}/frameworks/${framework}/export`;
}

export async function resetFramework(framework: FrameworkType): Promise<FrameworkData> {
  const res = await fetch(`${BASE}/frameworks/${framework}/reset`, { method: 'POST' });
  return handleResponse<FrameworkData>(res);
}

// ── AI ────────────────────────────────────────────────────────────────────────

export async function getAISuggestion(
  framework: FrameworkType,
  controlId: string
): Promise<string> {
  const res = await fetch(`${BASE}/ai/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ framework, controlId }),
  });
  const data = await handleResponse<{ suggestion: string }>(res);
  return data.suggestion;
}

export async function sendAIChat(
  framework: FrameworkType,
  messages: { role: 'user' | 'model'; content: string }[]
): Promise<string> {
  const res = await fetch(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ framework, messages }),
  });
  const data = await handleResponse<{ reply: string }>(res);
  return data.reply;
}

export async function getAuditSummary(framework: FrameworkType): Promise<string> {
  const res = await fetch(`${BASE}/ai/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ framework }),
  });
  const data = await handleResponse<{ summary: string }>(res);
  return data.summary;
}

export async function createControl(
  framework: FrameworkType,
  control: Partial<AuditControl>
): Promise<AuditControl> {
  const res = await fetch(`${BASE}/frameworks/${framework}/controls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(control),
  });
  return handleResponse<AuditControl>(res);
}

export async function deleteControl(
  framework: FrameworkType,
  controlId: string
): Promise<void> {
  const res = await fetch(`${BASE}/frameworks/${framework}/controls/${controlId}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

export async function importControls(
  framework: FrameworkType,
  file: File
): Promise<{ imported: number; skipped: number; total: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/frameworks/${framework}/import`, {
    method: 'POST',
    body: form,
  });
  return handleResponse<{ imported: number; skipped: number; total: number }>(res);
}

export interface EmailTemplateContext {
  type: 'checklist' | 'task';
  framework: string;
  srNo: string;
  title: string;
  domain?: string;
  documentRequired?: string;
  evidenceFiles: string[];
  auditorName: string;
}

export interface EmailTemplateResult {
  isIssue: boolean;
  subject: string | null;
  body: string | null;
}

export async function analyzeRemarkForEmail(
  remark: string,
  context: EmailTemplateContext
): Promise<EmailTemplateResult> {
  const res = await fetch(`${BASE}/ai/email-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remark, context }),
  });
  return handleResponse<EmailTemplateResult>(res);
}

export async function refineText(
  text: string,
  fieldLabel: string,
  context?: string
): Promise<string> {
  const res = await fetch(`${BASE}/ai/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fieldLabel, context }),
  });
  const data = await handleResponse<{ refined: string }>(res);
  return data.refined;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
import { Task } from '../types';

export async function fetchTasks(framework: FrameworkType): Promise<Task[]> {
  const res = await fetch(`${BASE}/tasks/${framework}`);
  const data = await handleResponse<{ tasks: Task[] }>(res);
  return data.tasks;
}

export async function createTask(framework: FrameworkType, task: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${framework}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  return handleResponse<Task>(res);
}

export async function updateTask(framework: FrameworkType, taskId: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${framework}/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Task>(res);
}

export async function deleteTask(framework: FrameworkType, taskId: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${framework}/${taskId}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

export async function uploadTaskDocument(framework: FrameworkType, taskId: string, files: File[]): Promise<{ documents: import('../types').EvidenceFile[] }> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(`${BASE}/tasks/${framework}/${taskId}/documents`, { method: 'POST', body: form });
  return handleResponse<{ documents: import('../types').EvidenceFile[] }>(res);
}

export async function deleteTaskDocument(framework: FrameworkType, taskId: string, fileId: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${framework}/${taskId}/documents/${fileId}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}

export function getTaskExportUrl(framework: FrameworkType): string {
  return `${BASE}/tasks/${framework}/export`;
}

export async function importTasks(framework: FrameworkType, file: File): Promise<{ imported: number; total: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/tasks/${framework}/import`, { method: 'POST', body: form });
  return handleResponse<{ imported: number; total: number }>(res);
}
