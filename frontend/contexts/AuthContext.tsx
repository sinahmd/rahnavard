'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '@/lib/api/http';
import {
  login as apiLogin,
  logout as apiLogout,
  getSession as apiGetSession,
} from '@/lib/api/auth';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
}

// Legacy key from the token era (Phases 0–1). The backend no longer uses it —
// this is a one-time migration cleanup so old browsers stop carrying it.
const LEGACY_TOKEN_KEY = 'admin_token';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * One-time purge of the legacy localStorage DRF token. Sessions now live in
 * the httpOnly `sessionid` cookie; any leftover key is dead weight that this
 * one call removes (removeItem on a missing key is a no-op, so it is safe to
 * run on every provider mount).
 */
function purgeLegacyToken(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  } catch {
    // Storage may be unavailable (e.g. hardened privacy modes) — ignore.
  }
}

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Bootstrap: ask the server who the session belongs to (401 when expired).
  const fetchSession = useCallback(async () => {
    try {
      const userData = await apiGetSession();
      setUser(userData);
      return userData;
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        // No (or expired) session — unauthenticated state.
        setUser(null);
      }
      // Network failures also leave the user null but do not redirect; the
      // layout guard only reacts once loading completes below.
      return null;
    }
  }, []);

  // Initialize auth state from the session cookie
  useEffect(() => {
    purgeLegacyToken();
    const initAuth = async () => {
      await fetchSession();
      setLoading(false);
    };
    initAuth();
  }, [fetchSession]);

  // Login: the backend establishes the session cookie; we just mirror the user.
  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    // The response still carries a legacy `token` field during dual-mode; the
    // session cookie is what authenticates subsequent requests, so the token
    // is deliberately ignored (and never stored).
    setUser(data.user);
  };

  // Logout: destroy the server-side session (and the legacy token server-side
  // too, while dual mode still mints them).
  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Deliberately ignored: logout must succeed locally even when the
      // server call fails (network drop, expired session, already logged
      // out elsewhere). The finally block clears state and navigates
      // regardless.
    } finally {
      purgeLegacyToken();
      setUser(null);
      router.push('/admin/login');
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    await fetchSession();
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user.is_staff;
  const isSuperUser = isAuthenticated && user.is_superuser;

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    isAdmin,
    isSuperUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
