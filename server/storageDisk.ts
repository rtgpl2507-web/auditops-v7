import fs from 'fs';
import path from 'path';
import os from 'os';
import { FrameworkType, FrameworkData, Task, FrameworkEntry, BUILTIN_FRAMEWORKS } from '../src/types';
import { generateFrameworkData } from './seedData';

const PERSISTENT_DATA_ROOT = process.env.AUDITOPS_DATA_DIR
  ? path.resolve(process.env.AUDITOPS_DATA_DIR)
  : path.join(process.cwd(), 'server', 'data');

const DATA_DIR      = path.join(PERSISTENT_DATA_ROOT, 'frameworks');
const UPLOADS_DIR   = path.join(PERSISTENT_DATA_ROOT, 'uploads');
const TASKS_DIR     = path.join(PERSISTENT_DATA_ROOT, 'tasks');
const REGISTRY_PATH = path.join(PERSISTENT_DATA_ROOT, 'registry.json');

[PERSISTENT_DATA_ROOT, DATA_DIR, UPLOADS_DIR, TASKS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Framework Registry ────────────────────────────────────────────────────────

interface Registry {
  custom: FrameworkEntry[];
}

function readRegistry(): Registry {
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8')) as Registry;
      if (!Array.isArray(parsed.custom)) return { custom: [] };
      return parsed;
    } catch (err) {
      console.error('[storage] Failed to parse registry.json — treating as empty:', err);
    }
  }
  return { custom: [] };
}

function writeRegistry(reg: Registry): void {
  const tmp = path.join(os.tmpdir(), `registry-${Date.now()}.json.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(reg, null, 2), 'utf-8');
    fs.renameSync(tmp, REGISTRY_PATH);
  } catch (err) {
    if (fs.existsSync(tmp)) { try { fs.unlinkSync(tmp); } catch {} }
    throw err;
  }
}

/** Returns the full list of frameworks: built-in first, then custom. */
export function listFrameworks(): FrameworkEntry[] {
  const builtins: FrameworkEntry[] = [
    { id: 'ITGC',    name: 'ITGC',    description: 'Information Technology General Controls',             isBuiltin: true },
    { id: 'ITAC',    name: 'ITAC',    description: 'Information Technology Application Controls',          isBuiltin: true },
    { id: 'SOC2',    name: 'SOC2',    description: 'Service Organization Control 2',                       isBuiltin: true },
    { id: 'ISO27001',name: 'ISO27001',description: 'Information Security Management',                      isBuiltin: true },
    { id: 'HIPAA',   name: 'HIPAA',   description: 'Health Insurance Portability and Accountability Act',  isBuiltin: true },
  ];
  const { custom } = readRegistry();
  return [...builtins, ...custom];
}

/** Registers a brand-new custom framework. Returns null if name already taken. */
export function registerFramework(name: string, description: string): FrameworkEntry | null {
  const id = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  // check against built-ins
  if ((BUILTIN_FRAMEWORKS as readonly string[]).includes(id)) return null;

  const reg = readRegistry();
  if (reg.custom.some(c => c.id === id)) return null;

  const entry: FrameworkEntry = { id, name: name.trim(), description: description.trim(), isBuiltin: false };
  reg.custom.push(entry);
  writeRegistry(reg);

  // Initialise with empty framework data right away
  const data: FrameworkData = { framework: id, controls: [], tasks: [], activity: [] };
  saveFrameworkData(id, data);

  return entry;
}

/** Renames an existing custom framework. Returns the updated entry or null if not found / name taken. */
export function renameFramework(id: string, newName: string, newDescription?: string): FrameworkEntry | null {
  const reg = readRegistry();
  const idx = reg.custom.findIndex(c => c.id === id);
  if (idx === -1) return null; // not found or is built-in

  const newId = newName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  // If the generated id changes, ensure it doesn't clash
  if (newId !== id) {
    if ((BUILTIN_FRAMEWORKS as readonly string[]).includes(newId)) return null;
    if (reg.custom.some((c, i) => c.id === newId && i !== idx)) return null;

    // Rename the data file on disk
    const oldPath = path.join(DATA_DIR, `${id}.json`);
    const newPath = path.join(DATA_DIR, `${newId}.json`);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);

    // Also rename the tasks file
    const oldTasksPath = path.join(TASKS_DIR, `${id}_tasks.json`);
    const newTasksPath = path.join(TASKS_DIR, `${newId}_tasks.json`);
    if (fs.existsSync(oldTasksPath)) fs.renameSync(oldTasksPath, newTasksPath);

    // Update the framework field inside the data file
    if (fs.existsSync(newPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
        data.framework = newId;
        fs.writeFileSync(newPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch { /* ignore */ }
    }
  }

  reg.custom[idx] = {
    id: newId,
    name: newName.trim(),
    description: newDescription !== undefined ? newDescription.trim() : reg.custom[idx].description,
    isBuiltin: false,
  };
  writeRegistry(reg);
  return reg.custom[idx];
}

/** Deletes a custom framework and all its data. Returns true on success. */
export function deleteFramework(id: string): boolean {
  const reg = readRegistry();
  const idx = reg.custom.findIndex(c => c.id === id);
  if (idx === -1) return false; // not found or built-in

  // Remove data files
  const dataPath = path.join(DATA_DIR, `${id}.json`);
  if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);

  const tasksPath = path.join(TASKS_DIR, `${id}_tasks.json`);
  if (fs.existsSync(tasksPath)) fs.unlinkSync(tasksPath);

  // Remove uploads directory
  const uploadsPath = path.join(UPLOADS_DIR, id);
  if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });

  reg.custom.splice(idx, 1);
  writeRegistry(reg);
  return true;
}

// ── Framework Data ────────────────────────────────────────────────────────────

function getFrameworkPath(framework: FrameworkType): string {
  return path.join(DATA_DIR, `${framework}.json`);
}

function getTasksPath(framework: FrameworkType): string {
  return path.join(TASKS_DIR, `${framework}_tasks.json`);
}

export function getFrameworkData(framework: FrameworkType): FrameworkData {
  const filePath = getFrameworkPath(framework);
  let data: FrameworkData;
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw) as FrameworkData;
  } else {
    // For built-in frameworks use seed data; for custom ones start empty
    const isBuiltin = (BUILTIN_FRAMEWORKS as readonly string[]).includes(
      String(framework).toUpperCase()
    );
    if (isBuiltin) {
      data = generateFrameworkData(framework);
    } else {
      data = { framework, controls: [], tasks: [], activity: [] };
    }
  }
  if (!data.tasks) data.tasks = loadTasks(framework);
  saveFrameworkData(framework, data);
  return data;
}

export function loadTasks(framework: FrameworkType): Task[] {
  const fp = getTasksPath(framework);
  if (fs.existsSync(fp)) {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Task[];
  }
  return [];
}

export function saveFrameworkData(framework: FrameworkType, data: FrameworkData): void {
  const filePath = getFrameworkPath(framework);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  fs.writeFileSync(getTasksPath(framework), JSON.stringify(data.tasks ?? [], null, 2), 'utf-8');
}

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

export function resetFrameworkData(framework: FrameworkType): FrameworkData {
  const isBuiltin = (BUILTIN_FRAMEWORKS as readonly string[]).includes(
    String(framework).toUpperCase()
  );
  const data = isBuiltin
    ? generateFrameworkData(framework)
    : { framework, controls: [], tasks: [], activity: [] };
  data.tasks = [];
  saveFrameworkData(framework, data);
  return data;
}
