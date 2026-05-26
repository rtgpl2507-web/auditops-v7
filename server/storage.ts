import fs from 'fs';
import path from 'path';
import { FrameworkType, FrameworkData, Task } from '../src/types';
import { generateFrameworkData } from './seedData';

const DATA_DIR = path.join(process.cwd(), 'server', 'data', 'frameworks');
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'data', 'uploads');
const TASKS_DIR = path.join(process.cwd(), 'server', 'data', 'tasks');

[DATA_DIR, UPLOADS_DIR, TASKS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
    data = generateFrameworkData(framework);
  }
  // Ensure tasks array always present (backward compat)
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
  // Also persist tasks separately for quick access
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
  const data = generateFrameworkData(framework);
  data.tasks = [];
  saveFrameworkData(framework, data);
  return data;
}
