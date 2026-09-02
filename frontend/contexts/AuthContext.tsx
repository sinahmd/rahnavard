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

// Types
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
}

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

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user data
  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user/`, {
        headers: {
          Authorization: `Token ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        // Token is invalid
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
        return null;
      }
    } catch {
      return null;
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('admin_token');

      if (storedToken) {
        setToken(storedToken);
        await fetchUser(storedToken);
      }

      setLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  // Login function
  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.non_field_errors?.[0] ||
          error.detail ||
          'Login failed. Please check your credentials.'
      );
    }

    const data = await response.json();
    const authToken = data.token;

    // Store token
    localStorage.setItem('admin_token', authToken);
    setToken(authToken);

    // Fetch user info
    await fetchUser(authToken);
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch {
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
      await fetchUser(token);
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

// HOC for protected pages
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: 'admin' | 'superuser'
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isAdmin, isSuperUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          router.push('/admin/login');
          return;
        }

        if (requiredRole === 'admin' && !isAdmin) {
          router.push('/admin/login');
          return;
        }

        if (requiredRole === 'superuser' && !isSuperUser) {
          router.push('/admin');
          return;
        }
      }
    }, [isAuthenticated, isAdmin, isSuperUser, loading, router]);

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
      return null;
    }

    if (requiredRole === 'admin' && !isAdmin) {
      return null;
    }

    if (requiredRole === 'superuser' && !isSuperUser) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
