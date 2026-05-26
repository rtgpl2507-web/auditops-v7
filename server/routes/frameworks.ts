import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { FrameworkType, AuditControl, ControlStatus, EvidenceFile } from '../../src/types';
import {
  getFrameworkData,
  saveFrameworkData,
  getControlUploadsDir,
  deleteFileFromDisk,
  resetFrameworkData,
} from '../storage';

export const frameworkRouter = Router();

// ── Multer – dynamic destination per control ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { framework, controlId } = req.params as { framework: FrameworkType; controlId: string };
    cb(null, getControlUploadsDir(framework, controlId));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// CSV import multer (memory storage)
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET /api/frameworks/:framework ──────────────────────────────────────────
frameworkRouter.get('/:framework', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const data = getFrameworkData(framework);
  res.json(data);
});

// ── POST /api/frameworks/:framework/controls (create new checklist task) ─────
frameworkRouter.post('/:framework/controls', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const body = req.body as Partial<AuditControl>;

  const data = getFrameworkData(framework);
  const srCounter = data.controls.length + 1;

  const newControl: AuditControl = {
    id: `${framework}-ctrl-${Math.random().toString(36).substring(2, 9)}`,
    srNo: body.srNo || `${framework}-${String(srCounter).padStart(3, '0')}`,
    controlRefNo: body.controlRefNo || `${framework}-REF-${String(srCounter).padStart(3, '0')}`,
    domain: body.domain || '',
    subDomain: body.subDomain || '',
    controlPoint: body.controlPoint || '',
    controlDescription: body.controlDescription || '',
    documentRequired: body.documentRequired || '',
    status: (body.status as ControlStatus) || 'Not Started',
    clarification: body.clarification || '',
    remarks: body.remarks || '',
    evidence: [],
    updatedAt: new Date().toISOString(),
  };

  data.controls.push(newControl);
  data.activity.unshift({
    id: Math.random().toString(36).substring(2, 9),
    controlId: newControl.id,
    controlPoint: newControl.controlPoint,
    action: 'Created new checklist task',
    timestamp: new Date().toISOString(),
    user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);
  saveFrameworkData(framework, data);
  res.status(201).json(newControl);
});

// ── PUT /api/frameworks/:framework/controls/:controlId ───────────────────────
frameworkRouter.put('/:framework/controls/:controlId', (req: Request, res: Response) => {
  const { framework, controlId } = req.params as { framework: FrameworkType; controlId: string };
  const updates: Partial<AuditControl> = req.body;

  const data = getFrameworkData(framework);
  const idx = data.controls.findIndex(c => c.id === controlId);
  if (idx === -1) return res.status(404).json({ error: 'Control not found' });

  const { evidence: _e, id: _id, ...safeUpdates } = updates as any;

  data.controls[idx] = {
    ...data.controls[idx],
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  };

  const updatedFields = Object.keys(safeUpdates).join(', ');
  data.activity.unshift({
    id: Math.random().toString(36).substring(2, 9),
    controlId,
    controlPoint: data.controls[idx].controlPoint,
    action: `Updated ${updatedFields}`,
    timestamp: new Date().toISOString(),
    user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);

  saveFrameworkData(framework, data);
  res.json(data.controls[idx]);
});

// ── DELETE /api/frameworks/:framework/controls/:controlId ────────────────────
frameworkRouter.delete('/:framework/controls/:controlId', (req: Request, res: Response) => {
  const { framework, controlId } = req.params as { framework: FrameworkType; controlId: string };

  const data = getFrameworkData(framework);
  const idx = data.controls.findIndex(c => c.id === controlId);
  if (idx === -1) return res.status(404).json({ error: 'Control not found' });

  const control = data.controls[idx];
  data.controls.splice(idx, 1);

  data.activity.unshift({
    id: Math.random().toString(36).substring(2, 9),
    controlId,
    controlPoint: control.controlPoint,
    action: 'Deleted checklist task',
    timestamp: new Date().toISOString(),
    user: 'Current User',
  });
  data.activity = data.activity.slice(0, 200);

  saveFrameworkData(framework, data);
  res.json({ success: true });
});

// ── POST /api/frameworks/:framework/controls/:controlId/evidence ─────────────
frameworkRouter.post(
  '/:framework/controls/:controlId/evidence',
  upload.array('files', 10),
  (req: Request, res: Response) => {
    const { framework, controlId } = req.params as { framework: FrameworkType; controlId: string };
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0)
      return res.status(400).json({ error: 'No files uploaded' });

    const data = getFrameworkData(framework);
    const idx = data.controls.findIndex(c => c.id === controlId);
    if (idx === -1) return res.status(404).json({ error: 'Control not found' });

    const newEvidence: EvidenceFile[] = files.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.originalname,
      storedName: f.filename,
      type: path.extname(f.originalname).slice(1).toLowerCase() || 'bin',
      size: f.size,
      uploadedAt: new Date().toISOString(),
      url: `/api/uploads/${framework}/${controlId}/${f.filename}`,
    }));

    data.controls[idx].evidence.push(...newEvidence);
    data.controls[idx].updatedAt = new Date().toISOString();

    data.activity.unshift({
      id: Math.random().toString(36).substring(2, 9),
      controlId,
      controlPoint: data.controls[idx].controlPoint,
      action: `Uploaded ${files.length} evidence file(s)`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    data.activity = data.activity.slice(0, 200);

    saveFrameworkData(framework, data);
    res.json({ evidence: data.controls[idx].evidence });
  }
);

// ── DELETE /api/frameworks/:framework/controls/:controlId/evidence/:fileId ───
frameworkRouter.delete(
  '/:framework/controls/:controlId/evidence/:fileId',
  (req: Request, res: Response) => {
    const { framework, controlId, fileId } = req.params as {
      framework: FrameworkType;
      controlId: string;
      fileId: string;
    };

    const data = getFrameworkData(framework);
    const idx = data.controls.findIndex(c => c.id === controlId);
    if (idx === -1) return res.status(404).json({ error: 'Control not found' });

    const file = data.controls[idx].evidence.find(e => e.id === fileId);
    if (!file) return res.status(404).json({ error: 'Evidence file not found' });

    if ((file as any).storedName) {
      deleteFileFromDisk(framework, controlId, (file as any).storedName);
    }

    data.controls[idx].evidence = data.controls[idx].evidence.filter(e => e.id !== fileId);
    data.controls[idx].updatedAt = new Date().toISOString();

    data.activity.unshift({
      id: Math.random().toString(36).substring(2, 9),
      controlId,
      controlPoint: data.controls[idx].controlPoint,
      action: `Deleted evidence file: ${file.name}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    data.activity = data.activity.slice(0, 200);

    saveFrameworkData(framework, data);
    res.json({ success: true });
  }
);

// ── GET /api/frameworks/:framework/export ────────────────────────────────────
frameworkRouter.get('/:framework/export', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const data = getFrameworkData(framework);

  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Sr No', 'Control Ref No', 'Domain', 'Sub-Domain', 'Control Point', 'Control Description',
    'Document Required', 'Status', 'Evidence Count', 'Clarification', 'Auditor Remarks', 'Last Updated',
  ];

  const rows = data.controls.map(c => [
    escape(c.srNo),
    escape(c.controlRefNo || ''),
    escape(c.domain),
    escape(c.subDomain),
    escape(c.controlPoint),
    escape(c.controlDescription),
    escape(c.documentRequired),
    escape(c.status),
    escape(String(c.evidence.length)),
    escape(c.clarification),
    escape(c.remarks),
    escape(new Date(c.updatedAt).toLocaleDateString('en-IN')),
  ]);

  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${framework}_Audit_Checklist.csv"`);
  res.send(csv);
});

// ── POST /api/frameworks/:framework/import ────────────────────────────────────
frameworkRouter.post('/:framework/import', csvUpload.single('file'), (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  try {
    const csv = req.file.buffer.toString('utf-8');

    // ── Proper RFC-4180 CSV parser ────────────────────────────────────────────
    // The previous naive split(',') broke on quoted fields that contain commas
    // (e.g. "Users must be reviewed, validated…") causing ~60% of rows to be
    // silently skipped because column indices shifted. This parser correctly
    // handles: quoted fields, commas inside quotes, escaped double-quotes (""),
    // and quoted fields that span multiple lines.
    function parseCSV(text: string): string[][] {
      const rows: string[][] = [];
      let row: string[] = [];
      let field = '';
      let inQuotes = false;
      let i = 0;

      while (i < text.length) {
        const ch = text[i];

        if (inQuotes) {
          if (ch === '"') {
            // peek ahead — "" means escaped quote inside field
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
              continue;
            }
            // closing quote
            inQuotes = false;
            i++;
            continue;
          }
          field += ch;
          i++;
          continue;
        }

        // not in quotes
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        }

        if (ch === ',') {
          row.push(field);
          field = '';
          i++;
          continue;
        }

        if (ch === '\r') {
          // handle \r\n and bare \r
          row.push(field);
          field = '';
          if (text[i + 1] === '\n') i++;
          rows.push(row);
          row = [];
          i++;
          continue;
        }

        if (ch === '\n') {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
          i++;
          continue;
        }

        field += ch;
        i++;
      }

      // flush last field/row
      if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
      }

      return rows;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const allRows = parseCSV(csv);

    // Filter out completely empty rows (trailing newlines etc.)
    const dataRows = allRows.filter(row => row.some(cell => cell.trim() !== ''));

    if (dataRows.length < 2) return res.status(400).json({ error: 'CSV has no data rows' });

    const data = getFrameworkData(framework);
    let importedCount = 0;
    let skippedCount = 0;

    // Row 0 is the header — start from row 1
    for (let i = 1; i < dataRows.length; i++) {
      const cols = dataRows[i];

      // Need at minimum: srNo, controlRefNo, domain, subDomain, controlPoint,
      // controlDescription, documentRequired, status  (8 columns)
      if (cols.length < 8) {
        skippedCount++;
        continue;
      }

      const [
        srNo,
        controlRefNo,
        domain,
        subDomain,
        controlPoint,
        controlDescription,
        documentRequired,
        status,
      ] = cols;

      // Skip rows with no control point (truly empty data rows)
      if (!controlPoint.trim()) {
        skippedCount++;
        continue;
      }

      // Optional columns — safe to be absent
      const clarification = cols[9]  ?? '';
      const remarks        = cols[10] ?? '';

      const existingIdx = data.controls.findIndex(c => c.srNo === srNo.trim());
      const controlData: AuditControl = {
        id: existingIdx >= 0
          ? data.controls[existingIdx].id
          : `${framework}-ctrl-${Math.random().toString(36).substring(2, 9)}`,
        srNo: srNo.trim() || `${framework}-${String(data.controls.length + 1).padStart(3, '0')}`,
        controlRefNo:       controlRefNo.trim(),
        domain:             domain.trim(),
        subDomain:          subDomain.trim(),
        controlPoint:       controlPoint.trim(),
        controlDescription: controlDescription.trim(),
        documentRequired:   documentRequired.trim(),
        status: (['Not Started', 'In Progress', 'Pending From Client', 'Completed'].includes(status.trim())
          ? status.trim()
          : 'Not Started') as ControlStatus,
        clarification: clarification.trim(),
        remarks:        remarks.trim(),
        evidence: existingIdx >= 0 ? data.controls[existingIdx].evidence : [],
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        data.controls[existingIdx] = controlData;
      } else {
        data.controls.push(controlData);
      }
      importedCount++;
    }

    data.activity.unshift({
      id: Math.random().toString(36).substring(2, 9),
      controlId: '',
      controlPoint: '',
      action: `Imported ${importedCount} controls from CSV${skippedCount > 0 ? ` (${skippedCount} rows skipped — missing required fields)` : ''}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    saveFrameworkData(framework, data);
    res.json({ imported: importedCount, skipped: skippedCount, total: data.controls.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/frameworks/:framework/reset ────────────────────────────────────
frameworkRouter.post('/:framework/reset', (req: Request, res: Response) => {
  const { framework } = req.params as { framework: FrameworkType };
  const data = resetFrameworkData(framework);
  res.json(data);
});
