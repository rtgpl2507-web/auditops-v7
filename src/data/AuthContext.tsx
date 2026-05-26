import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthUser {
  username: string;
  displayName: string;
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

// The 4 authorized users (no registration)
const AUTHORIZED_USERS: { username: string; password: string; displayName: string; initials: string }[] = [
  { username: 'admin', password: 'Admin@2003', displayName: 'Admin User', initials: 'AU' },
  { username: 'aditya', password: 'Aditya@123', displayName: 'Aditya Limbachiya', initials: 'AL' },
  { username: 'anagha', password: 'Anagha@123', displayName: 'Anagha Kulkarni', initials: 'AK' },
  { username: 'dhaval', password: 'Dhaval@123', displayName: 'Dhaval Limbani', initials: 'DL' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('auditops_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (username: string, password: string): boolean => {
    const found = AUTHORIZED_USERS.find(u => u.username === username && u.password === password);
    if (found) {
      const authUser = { username: found.username, displayName: found.displayName, initials: found.initials };
      setUser(authUser);
      try { sessionStorage.setItem('auditops_user', JSON.stringify(authUser)); } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('auditops_user');
      sessionStorage.removeItem('auditops_framework'); // clear persisted framework on sign-out
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
