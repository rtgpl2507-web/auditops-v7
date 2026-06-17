import fs from 'fs';
import path from 'path';
import { FrameworkType, FrameworkData, Task, FrameworkEntry, AuditControl, Activity, BUILTIN_FRAMEWORKS } from '../src/types';
import { generateFrameworkData } from './seedData';
import { getSupabase } from './supabaseClient';

// Evidence files and task documents are still written to local disk —
// Supabase here replaces the JSON registry/framework/task data, not file
// storage. Moving file uploads to Supabase Storage is a separate, optional
// step (see FRAMEWORK_FIX.md). Keep the same persistent-disk pattern so
// uploaded evidence still survives restarts when AUDITOPS_DATA_DIR is set.
const PERSISTENT_DATA_ROOT = process.env.AUDITOPS_DATA_DIR
  ? path.resolve(process.env.AUDITOPS_DATA_DIR)
  : path.join(process.cwd(), 'server', 'data');
const UPLOADS_DIR = path.join(PERSISTENT_DATA_ROOT, 'uploads');
[PERSISTENT_DATA_ROOT, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const BUILTIN_ENTRIES: FrameworkEntry[] = [
  { id: 'ITGC',     name: 'ITGC',     description: 'Information Technology General Controls',            isBuiltin: true },
  { id: 'ITAC',     name: 'ITAC',     description: 'Information Technology Application Controls',         isBuiltin: true },
  { id: 'SOC2',     name: 'SOC2',     description: 'Service Organization Control 2',                      isBuiltin: true },
  { id: 'ISO27001', name: 'ISO27001', description: 'Information Security Management',                     isBuiltin: true },
  { id: 'HIPAA',    name: 'HIPAA',    description: 'Health Insurance Portability and Accountability Act', isBuiltin: true },
];

/** Returns the full list of frameworks: built-in first, then custom (from Supabase). */
export async function listFrameworks(): Promise<FrameworkEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('frameworks')
    .select('id, name, description, is_builtin')
    .eq('is_builtin', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Supabase listFrameworks failed: ${error.message}`);

  const custom: FrameworkEntry[] = (data ?? []).map(r => ({
    id: r.id, name: r.name, description: r.description, isBuiltin: false,
  }));
  return [...BUILTIN_ENTRIES, ...custom];
}

/** Registers a brand-new custom framework. Returns null if name already taken. */
export async function registerFramework(name: string, description: string): Promise<FrameworkEntry | null> {
  const id = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if ((BUILTIN_FRAMEWORKS as readonly string[]).includes(id)) return null;

  const supabase = getSupabase();
  const { data: existing } = await supabase.from('frameworks').select('id').eq('id', id).maybeSingle();
  if (existing) return null;

  const { error: insertErr } = await supabase
    .from('frameworks')
    .insert({ id, name: name.trim(), description: description.trim(), is_builtin: false });
  if (insertErr) throw new Error(`Supabase registerFramework failed: ${insertErr.message}`);

  return { id, name: name.trim(), description: description.trim(), isBuiltin: false };
}

/** Renames an existing custom framework. Returns the updated entry or null if not found / name taken. */
export async function renameFramework(
  id: string, newName: string, newDescription?: string
): Promise<FrameworkEntry | null> {
  const supabase = getSupabase();
  const { data: current } = await supabase
    .from('frameworks').select('id, description').eq('id', id).eq('is_builtin', false).maybeSingle();
  if (!current) return null;

  const newId = newName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  if (newId !== id) {
    if ((BUILTIN_FRAMEWORKS as readonly string[]).includes(newId)) return null;
    const { data: clash } = await supabase.from('frameworks').select('id').eq('id', newId).maybeSingle();
    if (clash) return null;

    // Update the primary key — cascades to controls/tasks/activity via FK references.
    // Postgres allows updating a primary key referenced by foreign keys as long as
    // the FK constraints use the default action; our schema relies on this update
    // happening inside one statement so dependent rows are not orphaned.
    const { error: pkErr } = await supabase.from('frameworks').update({ id: newId }).eq('id', id);
    if (pkErr) throw new Error(`Supabase renameFramework (id change) failed: ${pkErr.message}`);

    // Move any locally-stored evidence files to match the new id
    const oldUploads = path.join(UPLOADS_DIR, id);
    const newUploads = path.join(UPLOADS_DIR, newId);
    if (fs.existsSync(oldUploads)) fs.renameSync(oldUploads, newUploads);
    const oldTaskUploads = path.join(UPLOADS_DIR, `${id}_tasks`);
    const newTaskUploads = path.join(UPLOADS_DIR, `${newId}_tasks`);
    if (fs.existsSync(oldTaskUploads)) fs.renameSync(oldTaskUploads, newTaskUploads);
  }

  const finalDescription = newDescription !== undefined ? newDescription.trim() : current.description;
  const { error: updateErr } = await supabase
    .from('frameworks')
    .update({ name: newName.trim(), description: finalDescription })
    .eq('id', newId);
  if (updateErr) throw new Error(`Supabase renameFramework failed: ${updateErr.message}`);

  return { id: newId, name: newName.trim(), description: finalDescription, isBuiltin: false };
}

/** Deletes a custom framework and all its data. Returns true on success. */
export async function deleteFramework(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: current } = await supabase
    .from('frameworks').select('id').eq('id', id).eq('is_builtin', false).maybeSingle();
  if (!current) return false;

  // ON DELETE CASCADE in schema.sql removes controls/tasks/evidence/activity rows.
  const { error } = await supabase.from('frameworks').delete().eq('id', id);
  if (error) throw new Error(`Supabase deleteFramework failed: ${error.message}`);

  const uploadsPath = path.join(UPLOADS_DIR, id);
  if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });
  const taskUploadsPath = path.join(UPLOADS_DIR, `${id}_tasks`);
  if (fs.existsSync(taskUploadsPath)) fs.rmSync(taskUploadsPath, { recursive: true, force: true });

  return true;
}

// ── Framework Data ────────────────────────────────────────────────────────────

function rowToControl(r: any, evidence: any[]): AuditControl {
  return {
    id: r.id,
    srNo: r.sr_no,
    controlRefNo: r.control_ref_no,
    domain: r.domain,
    subDomain: r.sub_domain,
    controlPoint: r.control_point,
    controlDescription: r.control_description,
    documentRequired: r.document_required,
    status: r.status,
    clarification: r.clarification,
    remarks: r.remarks,
    evidence: evidence
      .filter(e => e.control_id === r.id)
      .map(e => ({
        id: e.id, name: e.name, storedName: e.stored_name, type: e.type,
        size: e.size, uploadedAt: e.uploaded_at, url: e.url,
      })),
    updatedAt: r.updated_at,
  };
}

function rowToTask(r: any, docs: any[]): Task {
  return {
    id: r.id,
    srNo: r.sr_no,
    taskName: r.task_name,
    taskDescription: r.task_description,
    status: r.status,
    documents: docs
      .filter(d => d.task_id === r.id)
      .map(d => ({
        id: d.id, name: d.name, storedName: d.stored_name, type: d.type,
        size: d.size, uploadedAt: d.uploaded_at, url: d.url,
      })),
    remarks: r.remarks,
    updatedAt: r.updated_at,
  };
}

function rowToActivity(r: any): Activity {
  return {
    id: r.id, controlId: r.control_id, controlPoint: r.control_point,
    action: r.action, timestamp: r.timestamp, user: r.user_name,
  };
}

/** Seeds a built-in framework's default controls into Supabase the first time it's accessed. */
async function seedBuiltinFramework(framework: FrameworkType): Promise<void> {
  const supabase = getSupabase();
  const seedData = generateFrameworkData(framework);

  await supabase.from('frameworks').upsert({
    id: framework, name: framework, description: '', is_builtin: true,
  });

  if (seedData.controls.length > 0) {
    const rows = seedData.controls.map(c => ({
      id: c.id, framework_id: framework, sr_no: c.srNo, control_ref_no: c.controlRefNo,
      domain: c.domain, sub_domain: c.subDomain, control_point: c.controlPoint,
      control_description: c.controlDescription, document_required: c.documentRequired,
      status: c.status, clarification: c.clarification, remarks: c.remarks,
      updated_at: c.updatedAt,
    }));
    const { error } = await supabase.from('controls').insert(rows);
    if (error) throw new Error(`Supabase seedBuiltinFramework (controls) failed: ${error.message}`);
  }
}

export async function getFrameworkData(framework: FrameworkType): Promise<FrameworkData> {
  const supabase = getSupabase();

  const { data: fwRow } = await supabase.from('frameworks').select('id').eq('id', framework).maybeSingle();
  const isBuiltin = (BUILTIN_FRAMEWORKS as readonly string[]).includes(String(framework).toUpperCase());

  if (!fwRow) {
    if (isBuiltin) {
      await seedBuiltinFramework(framework);
    } else {
      // Custom framework with no row yet (shouldn't normally happen — registerFramework
      // creates it) — create an empty shell so the read below succeeds.
      await supabase.from('frameworks').insert({ id: framework, name: framework, description: '', is_builtin: false });
    }
  }

  const [{ data: controlRows, error: cErr }, { data: evidenceRows, error: eErr },
         { data: taskRows, error: tErr }, { data: docRows, error: dErr },
         { data: activityRows, error: aErr }] = await Promise.all([
    supabase.from('controls').select('*').eq('framework_id', framework),
    supabase.from('evidence_files').select('*'),
    supabase.from('tasks').select('*').eq('framework_id', framework),
    supabase.from('task_documents').select('*'),
    supabase.from('activity_log').select('*').eq('framework_id', framework).order('timestamp', { ascending: false }).limit(200),
  ]);
  if (cErr || eErr || tErr || dErr || aErr) {
    const msg = cErr?.message ?? eErr?.message ?? tErr?.message ?? dErr?.message ?? aErr?.message;
    throw new Error(`Supabase getFrameworkData failed: ${msg}`);
  }

  const controls = (controlRows ?? []).map(r => rowToControl(r, evidenceRows ?? []));
  const tasks = (taskRows ?? []).map(r => rowToTask(r, docRows ?? []));
  const activity = (activityRows ?? []).map(rowToActivity);

  return { framework, controls, tasks, activity };
}

export async function loadTasks(framework: FrameworkType): Promise<Task[]> {
  const data = await getFrameworkData(framework);
  return data.tasks;
}

/**
 * Persists a full FrameworkData snapshot. Mirrors the disk version's
 * "save the whole object" contract by diffing and upserting controls/tasks/
 * activity rather than requiring every call site to be rewritten as
 * granular inserts. This keeps route handlers in routes/frameworks.ts and
 * routes/tasks.ts completely unchanged.
 */
export async function saveFrameworkData(framework: FrameworkType, data: FrameworkData): Promise<void> {
  const supabase = getSupabase();

  // Controls: replace the full set for this framework (small datasets, simplest correct approach)
  const { error: delCErr } = await supabase.from('controls').delete().eq('framework_id', framework);
  if (delCErr) throw new Error(`Supabase saveFrameworkData (clear controls) failed: ${delCErr.message}`);

  if (data.controls.length > 0) {
    const controlRows = data.controls.map(c => ({
      id: c.id, framework_id: framework, sr_no: c.srNo, control_ref_no: c.controlRefNo,
      domain: c.domain, sub_domain: c.subDomain, control_point: c.controlPoint,
      control_description: c.controlDescription, document_required: c.documentRequired,
      status: c.status, clarification: c.clarification, remarks: c.remarks,
      updated_at: c.updatedAt,
    }));
    const { error } = await supabase.from('controls').insert(controlRows);
    if (error) throw new Error(`Supabase saveFrameworkData (controls) failed: ${error.message}`);

    const evidenceRows = data.controls.flatMap(c =>
      c.evidence.map(e => ({
        id: e.id, control_id: c.id, name: e.name, stored_name: (e as any).storedName,
        type: e.type, size: e.size, uploaded_at: e.uploadedAt, url: e.url,
      }))
    );
    if (evidenceRows.length > 0) {
      const { error: evErr } = await supabase.from('evidence_files').upsert(evidenceRows);
      if (evErr) throw new Error(`Supabase saveFrameworkData (evidence) failed: ${evErr.message}`);
    }
  }

  // Tasks: same replace-all approach
  const { error: delTErr } = await supabase.from('tasks').delete().eq('framework_id', framework);
  if (delTErr) throw new Error(`Supabase saveFrameworkData (clear tasks) failed: ${delTErr.message}`);

  if (data.tasks.length > 0) {
    const taskRows = data.tasks.map(t => ({
      id: t.id, framework_id: framework, sr_no: t.srNo, task_name: t.taskName,
      task_description: t.taskDescription, status: t.status, remarks: t.remarks,
      updated_at: t.updatedAt,
    }));
    const { error } = await supabase.from('tasks').insert(taskRows);
    if (error) throw new Error(`Supabase saveFrameworkData (tasks) failed: ${error.message}`);

    const docRows = data.tasks.flatMap(t =>
      t.documents.map(d => ({
        id: d.id, task_id: t.id, name: d.name, stored_name: (d as any).storedName,
        type: d.type, size: d.size, uploaded_at: d.uploadedAt, url: d.url,
      }))
    );
    if (docRows.length > 0) {
      const { error: docErr } = await supabase.from('task_documents').upsert(docRows);
      if (docErr) throw new Error(`Supabase saveFrameworkData (task_documents) failed: ${docErr.message}`);
    }
  }

  // Activity log: insert only rows that don't already exist (it's append-only / capped at 200)
  if (data.activity.length > 0) {
    const activityRows = data.activity.map(a => ({
      id: a.id, framework_id: framework, control_id: a.controlId, control_point: a.controlPoint,
      action: a.action, user_name: a.user, timestamp: a.timestamp,
    }));
    const { error: actErr } = await supabase.from('activity_log').upsert(activityRows);
    if (actErr) throw new Error(`Supabase saveFrameworkData (activity_log) failed: ${actErr.message}`);
  }
}

// ── File uploads (unchanged — still local disk) ───────────────────────────────

export function getControlUploadsDir(framework: FrameworkType, controlId: string): string {
  const dir = path.join(UPLOADS_DIR, framework, controlId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getTaskUploadsDir(framework: FrameworkType, taskId: string): string {
  const dir = path.join(UPLOADS_DIR, `${framework}_tasks`, taskId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function deleteFileFromDisk(framework: FrameworkType, controlId: string, filename: string): boolean {
  const filePath = path.join(UPLOADS_DIR, framework, controlId, filename);
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); return true; }
  return false;
}

export function deleteTaskFileFromDisk(framework: FrameworkType, taskId: string, filename: string): boolean {
  const filePath = path.join(UPLOADS_DIR, `${framework}_tasks`, taskId, filename);
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); return true; }
  return false;
}

export async function resetFrameworkData(framework: FrameworkType): Promise<FrameworkData> {
  const isBuiltin = (BUILTIN_FRAMEWORKS as readonly string[]).includes(String(framework).toUpperCase());
  const seed = isBuiltin ? generateFrameworkData(framework) : { framework, controls: [], tasks: [], activity: [] };
  seed.tasks = [];
  await saveFrameworkData(framework, seed);
  return seed;
}
