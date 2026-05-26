/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './data/AuthContext';
import { AuditProvider, useAuditContext } from './data/AuditContext';
import { FrameworkSelector } from './components/FrameworkSelector';
import { Portal } from './components/Portal';
import { LoginPage } from './components/LoginPage';

function AppContent() {
  const { selectedFramework } = useAuditContext();

  if (!selectedFramework) {
    return <FrameworkSelector />;
  }

  return <Portal />;
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
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
