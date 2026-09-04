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
  getCurrentUser as apiGetCurrentUser,
} from '@/lib/api/auth';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  token: string | null;
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

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user data with the stored token (http.ts reads it from storage).
  const fetchUser = useCallback(async () => {
    try {
      const userData = await apiGetCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        // The server rejected the token — clear it (matches legacy
        // behaviour where any non-ok /auth/user/ response cleared state).
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
      }
      // Network failures return null without clearing the stored token,
      // exactly like the legacy raw-fetch implementation.
      return null;
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('admin_token');

      if (storedToken) {
        setToken(storedToken);
        await fetchUser();
      }

      setLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  // Login function
  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    const authToken = data.token;

    // Store token
    localStorage.setItem('admin_token', authToken);
    setToken(authToken);

    // Fetch user info (same second request the legacy flow made)
    await fetchUser();
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch {
      // Deliberately ignored: logout must succeed locally even when the
      // server call fails (network drop, expired session, already logged
      // out elsewhere). The finally block clears credentials and navigates
      // regardless; the server token is deleted server-side on the next
      // successful login via get_or_create reuse semantics.
    } finally {
      // Clear local state regardless of API response
      localStorage.removeItem('admin_token');
      setToken(null);
      setUser(null);
      router.push('/admin/login');
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (token) {
      await fetchUser();
    }
  };

  // Computed properties
  const isAuthenticated = !!user && !!token;
  const isAdmin = isAuthenticated && user.is_staff;
  const isSuperUser = isAuthenticated && user.is_superuser;

  const value: AuthContextType = {
    user,
    token,
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
