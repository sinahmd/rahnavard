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

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// One-time cleanup (plan §7 Phase 2.4, cutover commit): the pre-Phase-2
// `admin_token` localStorage key is dead weight — TokenAuthentication no
// longer exists, so the key authenticates nothing. It is REMOVED (never
// read, never written) on the first admin bootstrap.
const LEGACY_TOKEN_KEY = 'admin_token';

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Bootstrap: ask the server who the session belongs to.
  // Session-only auth (cutover): an anonymous session check answers 403 —
  // DRF only issues a 401 challenge through authenticators that provide a
  // WWW-Authenticate header, and SessionAuthentication provides none. Both
  // 401 and 403 therefore mean "no valid session".
  const fetchSession = useCallback(async () => {
    try {
      const userData = await apiGetSession();
      setUser(userData);
      return userData;
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.status === 403)
      ) {
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
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LEGACY_TOKEN_KEY);
      }
      await fetchSession();
      setLoading(false);
    };
    initAuth();
  }, [fetchSession]);

  // Login: the backend establishes the session cookie; we just mirror the user.
  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setUser(data.user);
  };

  // Logout: destroy the server-side session.
  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Deliberately ignored: logout must succeed locally even when the
      // server call fails (network drop, expired session, already logged
      // out elsewhere). The finally block clears state and navigates
      // regardless.
    } finally {
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
