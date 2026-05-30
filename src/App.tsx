/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './data/AuthContext';
import { AuditProvider, useAuditContext } from './data/AuditContext';
import { FrameworkSelector } from './components/FrameworkSelector';
import { Portal } from './components/Portal';
import { LoginPage } from './components/LoginPage';
import { verifyMasterAccess } from './services/api';

function AppContent() {
  const { selectedFramework } = useAuditContext();

  if (!selectedFramework) {
    return <FrameworkSelector />;
  }

  return <Portal />;
}

function MasterAccessGate({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState('');
  const [granted, setGranted] = useState(
    sessionStorage.getItem('master_access') === 'true'
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ok = await verifyMasterAccess(code);

    if (ok) {
      sessionStorage.setItem('master_access', 'true');
      setGranted(true);
    } else {
      setError('Invalid access code');
    }
  };

  if (granted) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl w-96 shadow-lg"
      >
        <h2 className="text-xl font-bold mb-4">AuditOps Access</h2>

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter Access Code"
          className="w-full border p-3 rounded"
        />

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}

        <button
          type="submit"
          className="w-full mt-4 bg-blue-600 text-white p-3 rounded"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

function AuthGate() {
  const { user, login } = useAuth();

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <AuditProvider>
      <AppContent />
    </AuditProvider>
  );
}

export default function App() {
  return (
    <MasterAccessGate>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </MasterAccessGate>
  );
}
