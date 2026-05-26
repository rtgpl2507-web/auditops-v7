import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { FrameworkType, Task } from '../types';
import * as api from '../services/api';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  editTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  uploadDoc: (taskId: string, files: File[]) => Promise<void>;
  removeDoc: (taskId: string, fileId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ framework, children }: { framework: FrameworkType; children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchTasks(framework);
      setTasks(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [framework]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const refreshTasks = async () => { await loadTasks(); };

  const addTask = async (task: Partial<Task>) => {
    const created = await api.createTask(framework, task);
    setTasks(prev => [...prev, created]);
  };

  const editTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    try {
      await api.updateTask(framework, taskId, updates);
    } catch (err) {
      await loadTasks();
      throw err;
    }
  };

  const removeTask = async (taskId: string) => {
    await api.deleteTask(framework, taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const uploadDoc = async (taskId: string, files: File[]) => {
    const { documents } = await api.uploadTaskDocument(framework, taskId, files);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, documents, updatedAt: new Date().toISOString() } : t));
  };

  const removeDoc = async (taskId: string, fileId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, documents: t.documents.filter(d => d.id !== fileId) } : t
    ));
    try {
      await api.deleteTaskDocument(framework, taskId, fileId);
    } catch (err) {
      await loadTasks();
      throw err;
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, loading, error, refreshTasks, addTask, editTask, removeTask, uploadDoc, removeDoc }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
