import React, { useState, useCallback } from 'react';
import { useAuditContext } from '../data/AuditContext';
import { useAuth } from '../data/AuthContext';
import { TaskProvider } from '../data/TaskContext';
import {
  LayoutDashboard, CheckSquare, ClipboardList, Settings,
  ArrowLeft, Bell, Bot, Loader2, LogOut
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Checklist } from './Checklist';
import { Tasks } from './Tasks';
import { AIAssistant } from './AIAssistant';
import { cn } from '../lib/utils';

type Tab = 'dashboard' | 'checklist' | 'tasks';

export function Portal() {
  const { frameworkData, selectFramework, loading, error } = useAuditContext();
  const { user, logout } = useAuth();
  // FIX: activeTab stored in state, NOT derived from URL — prevents page reload redirect
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [aiOpen, setAiOpen] = useState(false);

  // Safe tab setter — wraps in useCallback to avoid stale closures triggering reloads
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setAiOpen(false); // close AI panel on tab change for cleaner UX
  }, []);

  if (loading && !frameworkData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading framework data...</p>
        </div>
      </div>
    );
  }

  if (error && !frameworkData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <p className="text-red-600 font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <p className="text-slate-400 text-xs mb-4">Make sure the backend server is running on port 3001.</p>
          <button onClick={() => selectFramework(null)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Go Back</button>
        </div>
      </div>
    );
  }

  if (!frameworkData) return null;
  const { framework } = frameworkData;

  const tabTitle: Record<Tab, string> = {
    dashboard: `${framework} Dashboard`,
    checklist: `${framework} Audit Checklist`,
    tasks: `${framework} Tasks`,
  };

  return (
    <TaskProvider framework={framework}>
      <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white tracking-tight">AuditOps</h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-2 rounded text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {framework} Context
            </div>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1">
            <button onClick={() => handleTabChange('dashboard')}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors font-medium text-sm',
                activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
              )}>
              <LayoutDashboard size={18} /> Dashboard
            </button>

            <button onClick={() => handleTabChange('checklist')}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors font-medium text-sm',
                activeTab === 'checklist' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
              )}>
              <CheckSquare size={18} /> Audit Checklist
            </button>

            <button onClick={() => handleTabChange('tasks')}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors font-medium text-sm',
                activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
              )}>
              <ClipboardList size={18} /> Tasks
            </button>

            <button onClick={() => setAiOpen(prev => !prev)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors font-medium text-sm',
                aiOpen ? 'bg-purple-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
              )}>
              <Bot size={18} />
              AI Assistant
              {!aiOpen && (
                <span className="ml-auto text-[9px] bg-purple-500/30 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">AI</span>
              )}
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {user?.initials}
              </div>
              <span className="text-xs text-slate-400 truncate">{user?.displayName}</span>
            </div>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm">
              <Settings size={18} /> Settings
            </button>
            <button onClick={() => selectFramework(null)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left hover:bg-slate-800 text-slate-400 hover:text-white transition-colors font-medium text-sm">
              <ArrowLeft size={18} /> Change Framework
            </button>
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left hover:bg-slate-800 text-red-400 hover:text-red-300 transition-colors font-medium text-sm">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-slate-900">{tabTitle[activeTab]}</h1>
              {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setAiOpen(prev => !prev)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  aiOpen
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600'
                )}>
                <Bot size={16} /> AI Assistant
              </button>
              <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm border border-blue-200">
                {user?.initials}
              </div>
            </div>
          </header>

          <div className="flex-1 flex min-h-0">
            <div className={cn('flex-1 overflow-auto p-6 transition-all duration-300', aiOpen ? 'min-w-0' : '')}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'checklist' && <Checklist />}
              {activeTab === 'tasks' && <Tasks />}
            </div>

            {aiOpen && (
              <div className="w-96 shrink-0 border-l border-slate-200 flex flex-col overflow-hidden bg-white">
                <AIAssistant onClose={() => setAiOpen(false)} />
              </div>
            )}
          </div>
        </main>
      </div>
    </TaskProvider>
  );
}
