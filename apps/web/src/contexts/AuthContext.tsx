'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@expense/shared';

export type SessionTimeout = 'never' | '30' | '60' | '120';

const TIMEOUT_OPTIONS: SessionTimeout[] = ['never', '30', '60', '120'];
const TIMEOUT_STORAGE_KEY = 'session-timeout';
const IDLE_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sessionTimeout: SessionTimeout;
  setSessionTimeout: (t: SessionTimeout) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  sessionTimeout: 'never',
  setSessionTimeout: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeoutState] = useState<SessionTimeout>('never');
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session timeout preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TIMEOUT_STORAGE_KEY) as SessionTimeout | null;
    if (saved && TIMEOUT_OPTIONS.includes(saved)) {
      setSessionTimeoutState(saved);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  const setSessionTimeout = useCallback((value: SessionTimeout) => {
    setSessionTimeoutState(value);
    localStorage.setItem(TIMEOUT_STORAGE_KEY, value);
  }, []);

  // Idle-inactivity timer: log out after selected period with no user interaction
  useEffect(() => {
    if (!user || sessionTimeout === 'never') return;

    const ms = parseInt(sessionTimeout) * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), ms);
    }

    IDLE_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, sessionTimeout, logout]);

  return (
    <AuthContext.Provider value={{ user, loading, sessionTimeout, setSessionTimeout, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
