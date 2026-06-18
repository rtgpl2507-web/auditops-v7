/**
 * One-time migration: copies existing local-disk data (registry.json +
 * server/data/frameworks/*.json) into Supabase tables.
 *
 * Run this ONCE, after creating the schema (supabase/schema.sql) and BEFORE
 * switching SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY on in production. It is
 * safe to re-run — it uses upserts, so running it twice will not create
 * duplicate rows.
 *
 * Usage:
 *   npx tsx server/migrateToSupabase.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set (in
 * .env.local or the shell environment) when you run it.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { FrameworkEntry, FrameworkData } from '../src/types';

const PERSISTENT_DATA_ROOT = process.env.AUDITOPS_DATA_DIR
  ? path.resolve(process.env.AUDITOPS_DATA_DIR)
  : path.join(process.cwd(), 'server', 'data');

const DATA_DIR = path.join(PERSISTENT_DATA_ROOT, 'frameworks');
const REGISTRY_PATH = path.join(PERSISTENT_DATA_ROOT, 'registry.json');

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set to run this migration.');
    process.exit(1);
  }
  const supabase = getSupabase();

  // ── 1. Migrate the registry (custom framework entries) ─────────────────────
  let customEntries: FrameworkEntry[] = [];
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
      customEntries = Array.isArray(reg.custom) ? reg.custom : [];
    } catch (err) {
      console.error('Could not parse registry.json — skipping custom framework migration:', err);
    }
  }

  for (const entry of customEntries) {
    const { error } = await supabase.from('frameworks').upsert({
      id: entry.id, name: entry.name, description: entry.description, is_builtin: false,
    });
    if (error) console.error(`Failed to migrate framework registry entry ${entry.id}:`, error.message);
    else console.log(`Migrated framework registry entry: ${entry.id}`);
  }

  // ── 2. Migrate each framework's data file (built-in + custom) ──────────────
  if (!fs.existsSync(DATA_DIR)) {
    console.log('No frameworks directory found — nothing more to migrate.');
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const frameworkId = file.replace(/\.json$/, '');
    let data: FrameworkData;
    try {
      data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    } catch (err) {
      console.error(`Skipping ${file} — could not parse JSON:`, err);
      continue;
    }

    const isBuiltin = !customEntries.some(c => c.id === frameworkId);
    await supabase.from('frameworks').upsert({
      id: frameworkId,
      name: frameworkId,
      description: customEntries.find(c => c.id === frameworkId)?.description ?? '',
      is_builtin: isBuiltin,
    });

    if (data.controls?.length) {
      const controlRows = data.controls.map(c => ({
        id: c.id, framework_id: frameworkId, sr_no: c.srNo, control_ref_no: c.controlRefNo,
        domain: c.domain, sub_domain: c.subDomain, control_point: c.controlPoint,
        control_description: c.controlDescription, document_required: c.documentRequired,
        status: c.status, clarification: c.clarification, remarks: c.remarks,
        updated_at: c.updatedAt,
      }));
      const { error: cErr } = await supabase.from('controls').upsert(controlRows);
      if (cErr) console.error(`Failed to migrate controls for ${frameworkId}:`, cErr.message);

      const evidenceRows = data.controls.flatMap(c =>
        c.evidence.map(e => ({
          id: e.id, control_id: c.id, name: e.name, stored_name: (e as any).storedName,
          type: e.type, size: e.size, uploaded_at: e.uploadedAt, url: e.url,
        }))
      );
      if (evidenceRows.length) {
        const { error: eErr } = await supabase.from('evidence_files').upsert(evidenceRows);
        if (eErr) console.error(`Failed to migrate evidence for ${frameworkId}:`, eErr.message);
      }
    }

    if (data.tasks?.length) {
      const taskRows = data.tasks.map(t => ({
        id: t.id, framework_id: frameworkId, sr_no: t.srNo, task_name: t.taskName,
        task_description: t.taskDescription, status: t.status, remarks: t.remarks,
        updated_at: t.updatedAt,
      }));
      const { error: tErr } = await supabase.from('tasks').upsert(taskRows);
      if (tErr) console.error(`Failed to migrate tasks for ${frameworkId}:`, tErr.message);

      const docRows = data.tasks.flatMap(t =>
        t.documents.map(d => ({
          id: d.id, task_id: t.id, name: d.name, stored_name: (d as any).storedName,
          type: d.type, size: d.size, uploaded_at: d.uploadedAt, url: d.url,
        }))
      );
      if (docRows.length) {
        const { error: dErr } = await supabase.from('task_documents').upsert(docRows);
        if (dErr) console.error(`Failed to migrate task documents for ${frameworkId}:`, dErr.message);
      }
    }

    if (data.activity?.length) {
      const activityRows = data.activity.map(a => ({
        id: a.id, framework_id: frameworkId, control_id: a.controlId, control_point: a.controlPoint,
        action: a.action, user_name: a.user, timestamp: a.timestamp,
      }));
      const { error: aErr } = await supabase.from('activity_log').upsert(activityRows);
      if (aErr) console.error(`Failed to migrate activity log for ${frameworkId}:`, aErr.message);
    }

    console.log(`Migrated framework data: ${frameworkId} (${data.controls?.length ?? 0} controls, ${data.tasks?.length ?? 0} tasks)`);
  }

  console.log('\nMigration complete. Verify row counts in the Supabase Table Editor before switching the app over.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
