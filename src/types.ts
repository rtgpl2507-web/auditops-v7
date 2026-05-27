/** Built-in framework identifiers. Custom frameworks added at runtime are also valid strings. */
export type FrameworkType = string;

/** The five built-in audit frameworks shipped with AuditOps. */
export const BUILTIN_FRAMEWORKS = ['ITGC', 'ITAC', 'SOC2', 'ISO27001', 'HIPAA'] as const;
export type BuiltinFrameworkId = (typeof BUILTIN_FRAMEWORKS)[number];

/** Registry entry for a framework (built-in or custom). */
export interface FrameworkEntry {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
}

export type ControlStatus = 'In Progress' | 'Pending From Client' | 'Completed' | 'Not Started';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface EvidenceFile {
  id: string;
  name: string;
  storedName?: string;
  type: string;
  size: number;
  uploadedAt: string;
  url?: string;
}

export interface Activity {
  id: string;
  controlId: string;
  controlPoint: string;
  action: string;
  timestamp: string;
  user: string;
}

export interface AuditControl {
  id: string;
  srNo: string;
  controlRefNo: string;
  domain: string;
  subDomain: string;
  controlPoint: string;
  controlDescription: string;
  documentRequired: string;
  status: ControlStatus;
  clarification: string;
  remarks: string;
  evidence: EvidenceFile[];
  updatedAt: string;
}

export interface Task {
  id: string;
  srNo: string;
  taskName: string;
  taskDescription: string;
  status: TaskStatus;
  documents: EvidenceFile[];
  remarks: string;
  updatedAt: string;
}

export interface FrameworkData {
  framework: FrameworkType;
  controls: AuditControl[];
  tasks: Task[];
  activity: Activity[];
}

export interface User {
  username: string;
  password: string;
  displayName: string;
  initials: string;
}
