/**
 * Storage backend switcher.
 *
 * Route handlers import everything from this file only — they never import
 * storageDisk.ts or storageSupabase.ts directly. This is the single place
 * that decides which backend is active, so swapping backends later (or
 * adding a third one) never requires touching routes/frameworks.ts,
 * routes/tasks.ts, or routes/ai.ts again.
 *
 * Backend selection:
 *   - If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both set → Supabase
 *   - Otherwise → local disk (server/data/, or AUDITOPS_DATA_DIR if set)
 *
 * This means simply adding the two Supabase env vars switches the app over;
 * removing them (or unsetting) reverts to disk storage with zero code changes.
 */
import { isSupabaseConfigured } from './supabaseClient';
import * as disk from './storageDisk';
import * as db from './storageSupabase';

const USE_SUPABASE = isSupabaseConfigured();

if (USE_SUPABASE) {
  console.log('[storage] Using Supabase backend (SUPABASE_URL detected)');
} else {
  console.log('[storage] Using local disk backend (no Supabase env vars set)');
}

// ── Framework Registry ────────────────────────────────────────────────────────
export const listFrameworks = USE_SUPABASE ? db.listFrameworks : asAsync(disk.listFrameworks);
export const registerFramework = USE_SUPABASE ? db.registerFramework : asAsync(disk.registerFramework);
export const renameFramework = USE_SUPABASE ? db.renameFramework : asAsync(disk.renameFramework);
export const deleteFramework = USE_SUPABASE ? db.deleteFramework : asAsync(disk.deleteFramework);

// ── Framework Data ────────────────────────────────────────────────────────────
export const getFrameworkData = USE_SUPABASE ? db.getFrameworkData : asAsync(disk.getFrameworkData);
export const loadTasks = USE_SUPABASE ? db.loadTasks : asAsync(disk.loadTasks);
export const saveFrameworkData = USE_SUPABASE ? db.saveFrameworkData : asAsync(disk.saveFrameworkData);
export const resetFrameworkData = USE_SUPABASE ? db.resetFrameworkData : asAsync(disk.resetFrameworkData);

// ── File uploads (always local disk in both backends) ────────────────────────
export const getControlUploadsDir = disk.getControlUploadsDir;
export const getTaskUploadsDir = disk.getTaskUploadsDir;
export const deleteFileFromDisk = disk.deleteFileFromDisk;
export const deleteTaskFileFromDisk = disk.deleteTaskFileFromDisk;

/** Wraps a synchronous function so its return type matches the async Supabase equivalent. */
function asAsync<A extends any[], R>(fn: (...args: A) => R): (...args: A) => Promise<R> {
  return async (...args: A) => fn(...args);
}
