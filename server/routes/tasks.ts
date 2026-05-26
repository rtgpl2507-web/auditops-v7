import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { FrameworkType, Task, TaskStatus, EvidenceFile } from '../../src/types';
import {
  getFrameworkData,
  saveFrameworkData,
  getTaskUploadsDir,
  deleteTaskFileFromDisk,
} from '../storage';

export const taskRouter = Router();

// Multer for task document uploads
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { framework, taskId } = req.params as { framework: string; taskId: string };
    cb(null, getTaskUploadsDir(framework as FrameworkType, taskId));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// CSV import multer
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function genId() { return Math.random().toString(36).substring(2, 9); }

// GET /api/tasks/:framework
taskRouter.get('/:framework', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const data = getFrameworkData(framework);
  res.json({ tasks: data.tasks ?? [] });
});

// POST /api/tasks/:framework — create task
taskRouter.post('/:framework', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const body = req.body as Partial<Task>;
  const data = getFrameworkData(framework);
  const srCounter = (data.tasks?.length ?? 0) + 1;

  const task: Task = {
    id: `${framework}-task-${genId()}`,
    srNo: body.srNo || `T-${String(srCounter).padStart(3, '0')}`,
    taskName: body.taskName || '',
    taskDescription: body.taskDescription || '',
    status: (body.status as TaskStatus) || 'Not Started',
    documents: [],
    remarks: body.remarks || '',
    updatedAt: new Date().toISOString(),
  };

  if (!data.tasks) data.tasks = [];
  data.tasks.push(task);
  data.activity.unshift({
    id: genId(), controlId: task.id, controlPoint: task.taskName,
    action: 'Created new task', timestamp: new Date().toISOString(), user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);
  saveFrameworkData(framework, data);
  res.status(201).json(task);
});

// PUT /api/tasks/:framework/:taskId — update task
taskRouter.put('/:framework/:taskId', (req: Request, res: Response) => {
  const { framework, taskId } = req.params as { framework: FrameworkType; taskId: string };
  const updates = req.body as Partial<Task>;
  const data = getFrameworkData(framework);
  if (!data.tasks) data.tasks = [];
  const idx = data.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const { documents: _d, id: _id, ...safe } = updates as any;
  data.tasks[idx] = { ...data.tasks[idx], ...safe, updatedAt: new Date().toISOString() };
  data.activity.unshift({
    id: genId(), controlId: taskId, controlPoint: data.tasks[idx].taskName,
    action: `Updated task: ${Object.keys(safe).join(', ')}`,
    timestamp: new Date().toISOString(), user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);
  saveFrameworkData(framework, data);
  res.json(data.tasks[idx]);
});

// DELETE /api/tasks/:framework/:taskId
taskRouter.delete('/:framework/:taskId', (req: Request, res: Response) => {
  const { framework, taskId } = req.params as { framework: FrameworkType; taskId: string };
  const data = getFrameworkData(framework);
  if (!data.tasks) data.tasks = [];
  const idx = data.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  const task = data.tasks[idx];
  data.tasks.splice(idx, 1);
  data.activity.unshift({
    id: genId(), controlId: taskId, controlPoint: task.taskName,
    action: 'Deleted task', timestamp: new Date().toISOString(), user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);
  saveFrameworkData(framework, data);
  res.json({ success: true });
});

// POST /api/tasks/:framework/:taskId/documents — upload files
taskRouter.post(
  '/:framework/:taskId/documents',
  upload.array('files', 10),
  (req: Request, res: Response) => {
    const { framework, taskId } = req.params as { framework: FrameworkType; taskId: string };
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const data = getFrameworkData(framework);
    if (!data.tasks) data.tasks = [];
    const idx = data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    const newDocs: EvidenceFile[] = files.map(f => ({
      id: genId(), name: f.originalname, storedName: f.filename,
      type: path.extname(f.originalname).slice(1).toLowerCase() || 'bin',
      size: f.size, uploadedAt: new Date().toISOString(),
      url: `/api/uploads/${framework}_tasks/${taskId}/${f.filename}`,
    }));

    data.tasks[idx].documents.push(...newDocs);
    data.tasks[idx].updatedAt = new Date().toISOString();
    saveFrameworkData(framework, data);
    res.json({ documents: data.tasks[idx].documents });
  }
);

// DELETE /api/tasks/:framework/:taskId/documents/:fileId
taskRouter.delete('/:framework/:taskId/documents/:fileId', (req: Request, res: Response) => {
  const { framework, taskId, fileId } = req.params as { framework: FrameworkType; taskId: string; fileId: string };
  const data = getFrameworkData(framework);
  if (!data.tasks) data.tasks = [];
  const idx = data.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  const file = data.tasks[idx].documents.find(d => d.id === fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (file.storedName) deleteTaskFileFromDisk(framework, taskId, file.storedName);
  data.tasks[idx].documents = data.tasks[idx].documents.filter(d => d.id !== fileId);
  data.tasks[idx].updatedAt = new Date().toISOString();
  saveFrameworkData(framework, data);
  res.json({ success: true });
});

// GET /api/tasks/:framework/export
taskRouter.get('/:framework/export', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const data = getFrameworkData(framework);
  const tasks = data.tasks ?? [];
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Sr No', 'Task Name', 'Task Description', 'Status', 'Documents', 'Remarks', 'Last Updated'];
  const rows = tasks.map(t => [
    escape(t.srNo), escape(t.taskName), escape(t.taskDescription),
    escape(t.status), escape(String(t.documents.length)), escape(t.remarks),
    escape(new Date(t.updatedAt).toLocaleDateString('en-IN')),
  ]);
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${framework}_Tasks.csv"`);
  res.send(csv);
});

// POST /api/tasks/:framework/import
taskRouter.post('/:framework/import', csvUpload.single('file'), (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const csv = req.file.buffer.toString('utf-8');
    const lines = csv.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'No data rows' });
    const data = getFrameworkData(framework);
    if (!data.tasks) data.tasks = [];
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
      const [srNo, taskName, taskDescription, status, , remarks] = cols;
      if (!taskName) continue;
      const existing = data.tasks.findIndex(t => t.srNo === srNo);
      const taskData: Task = {
        id: existing >= 0 ? data.tasks[existing].id : `${framework}-task-${genId()}`,
        srNo: srNo || `T-${String(data.tasks.length + 1).padStart(3, '0')}`,
        taskName, taskDescription: taskDescription || '',
        status: (['Not Started', 'In Progress', 'Completed'].includes(status) ? status : 'Not Started') as TaskStatus,
        documents: existing >= 0 ? data.tasks[existing].documents : [],
        remarks: remarks || '',
        updatedAt: new Date().toISOString(),
      };
      if (existing >= 0) data.tasks[existing] = taskData;
      else data.tasks.push(taskData);
      count++;
    }
    saveFrameworkData(framework, data);
    res.json({ imported: count, total: data.tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
