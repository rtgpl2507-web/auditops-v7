import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { FrameworkType, FrameworkData, AuditControl } from '../types';
import * as api from '../services/api';

interface AuditContextType {
  selectedFramework: FrameworkType | null;
  selectFramework: (framework: FrameworkType | null) => void;
  frameworkData: FrameworkData | null;
  loading: boolean;
  error: string | null;
  updateControl: (controlId: string, updates: Partial<AuditControl>) => Promise<void>;
  uploadEvidence: (controlId: string, files: File[]) => Promise<void>;
  deleteEvidence: (controlId: string, fileId: string) => Promise<void>;
  refreshFramework: () => Promise<void>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// ─── Helper: persist selected framework across hard refreshes ────────────────
const SESSION_KEY = 'auditops_framework';

function readPersistedFramework(): FrameworkType | null {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v as FrameworkType | null;
  } catch {
    return null;
  }
}

function persistFramework(fw: FrameworkType | null) {
  try {
    if (fw) sessionStorage.setItem(SESSION_KEY, fw);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export function AuditProvider({ children }: { children: ReactNode }) {
  // ⬇ Initialise from sessionStorage so a hard-refresh restores the last framework
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType | null>(
    readPersistedFramework
  );
  const [frameworkData, setFrameworkData] = useState<FrameworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFramework = useCallback(async (framework: FrameworkType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchFramework(framework);
      setFrameworkData(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load framework data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      loadFramework(selectedFramework);
    } else {
      setFrameworkData(null);
    }
  }, [selectedFramework, loadFramework]);

  // Keep sessionStorage in sync whenever selectedFramework changes
  const selectFramework = useCallback((framework: FrameworkType | null) => {
    persistFramework(framework);
    setSelectedFramework(framework);
  }, []);

  const refreshFramework = useCallback(async () => {
    if (selectedFramework) {
      try {
        const data = await api.fetchFramework(selectedFramework);
        setFrameworkData(data);
      } catch (err: any) {
        console.error('Refresh failed:', err.message);
      }
    }
  }, [selectedFramework]);

  const updateControl = useCallback(async (controlId: string, updates: Partial<AuditControl>) => {
    if (!selectedFramework || !frameworkData) return;
    // Optimistic update — never calls loadFramework to avoid redirect side-effects
    setFrameworkData(prev => {
      if (!prev) return prev;
      const newControls = prev.controls.map(c =>
        c.id === controlId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      const control = newControls.find(c => c.id === controlId);
      return {
        ...prev,
        controls: newControls,
        activity: [
          {
            id: Math.random().toString(36).substring(2, 9),
            controlId,
            controlPoint: control?.controlPoint ?? '',
            action: `Updated ${Object.keys(updates).join(', ')}`,
            timestamp: new Date().toISOString(),
            user: 'Current User',
          },
          ...prev.activity,
        ],
      };
    });
    try {
      await api.updateControl(selectedFramework, controlId, updates);
    } catch (err: any) {
      // Rollback without touching selectedFramework
      try {
        const fresh = await api.fetchFramework(selectedFramework);
        setFrameworkData(fresh);
      } catch {}
      throw err;
    }
  }, [selectedFramework, frameworkData]);

  const uploadEvidence = useCallback(async (controlId: string, files: File[]) => {
    if (!selectedFramework) return;
    const { evidence } = await api.uploadEvidence(selectedFramework, controlId, files);
    setFrameworkData(prev => {
      if (!prev) return prev;
      const newControls = prev.controls.map(c =>
        c.id === controlId ? { ...c, evidence, updatedAt: new Date().toISOString() } : c
      );
      const control = newControls.find(c => c.id === controlId);
      return {
        ...prev,
        controls: newControls,
        activity: [
          {
            id: Math.random().toString(36).substring(2, 9),
            controlId,
            controlPoint: control?.controlPoint ?? '',
            action: `Uploaded ${files.length} evidence file(s)`,
            timestamp: new Date().toISOString(),
            user: 'Current User',
          },
          ...prev.activity,
        ],
      };
    });
  }, [selectedFramework]);

  const deleteEvidence = useCallback(async (controlId: string, fileId: string) => {
    if (!selectedFramework) return;
    setFrameworkData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        controls: prev.controls.map(c =>
          c.id === controlId
            ? { ...c, evidence: c.evidence.filter(e => e.id !== fileId) }
            : c
        ),
      };
    });
    try {
      await api.deleteEvidence(selectedFramework, controlId, fileId);
    } catch (err: any) {
      try {
        const fresh = await api.fetchFramework(selectedFramework);
        setFrameworkData(fresh);
      } catch {}
      throw err;
    }
  }, [selectedFramework]);

  return (
    <AuditContext.Provider
      value={{
        selectedFramework,
        selectFramework,
        frameworkData,
        loading,
        error,
        updateControl,
        uploadEvidence,
        deleteEvidence,
        refreshFramework,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
}

export function useAuditContext() {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAuditContext must be used within an AuditProvider');
  }
  return context;
}
