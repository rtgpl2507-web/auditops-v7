import React from 'react';
import { Award, Shield, FileCheck, Lock, Activity } from 'lucide-react';
import { FrameworkType } from '../types';
import { useAuditContext } from '../data/AuditContext';

const frameWorks: { id: FrameworkType; name: string; description: string; icon: React.ElementType }[] = [
  {
    id: 'ITGC',
    name: 'ITGC',
    description: 'Information Technology General Controls',
    icon: Shield
  },
  {
    id: 'ITAC',
    name: 'ITAC',
    description: 'Information Technology Application Controls',
    icon: Activity
  },
  {
    id: 'SOC2',
    name: 'SOC2',
    description: 'Service Organization Control 2',
    icon: FileCheck
  },
  {
    id: 'ISO27001',
    name: 'ISO27001',
    description: 'Information Security Management',
    icon: Award
  },
  {
    id: 'HIPAA',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act',
    icon: Lock
  }
];

export function FrameworkSelector() {
  const { selectFramework } = useAuditContext();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">AuditOps</h1>
          <p className="text-slate-500 mt-3 text-lg">Select an isolated framework workspace to continue</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameWorks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => selectFramework(fw.id)}
              className="group bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all text-left flex flex-col items-start gap-4"
            >
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <fw.icon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{fw.name}</h3>
                <p className="text-slate-500 mt-1 text-sm">{fw.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
