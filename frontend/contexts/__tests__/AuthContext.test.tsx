import '@testing-library/jest-dom'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth, withAuth } from '../AuthContext'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Test component that uses the auth context
function TestComponent() {
  const { user, token, loading, login, logout, refreshUser, isAuthenticated, isAdmin, isSuperUser } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="admin">{isAdmin.toString()}</div>
      <div data-testid="superuser">{isSuperUser.toString()}</div>
      <div data-testid="user">{user?.username || 'no-user'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <button onClick={async () => { try { await login('testuser', 'password') } catch {} }}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => refreshUser()}>Refresh</button>
    </div>
  )
}

// Simple wrapped component for withAuth tests
function DummyPage() {
  return <div data-testid="protected-content">Protected Content</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should provide initial state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
  })

  it('should load token from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('testuser')
  })

  it('should handle login', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'new-token',
          user: { id: 1, username: 'testuser', is_staff: true, is_superuser: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false }),
      })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Login'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('testuser')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token', 'new-token')
  })

  it('should handle logout', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token')
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token')
  })

  it('should handle login failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Login'))
    })

    // After failed login, authenticated should still be false
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('should clear token when stored token is invalid on mount', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid token' }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token')
  })

  it('should handle fetchUser network error gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('some-token')
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('should handle refreshUser', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token')
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false, email: 'test@example.com' }),
      })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh'))
    })

    // Should still be authenticated after refresh
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
  })

  it('should not refreshUser when no token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh'))
    })

    // No additional fetch should have been made
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle logout API failure gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token')
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser', is_staff: true, is_superuser: false }),
      })
      .mockRejectedValueOnce(new Error('Network error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token')
  })

  it('should detect admin and superuser roles', async () => {
    localStorageMock.getItem.mockReturnValue('stored-token')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'admin', is_staff: true, is_superuser: true }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('admin')).toHaveTextContent('true')
    expect(screen.getByTestId('superuser')).toHaveTextContent('true')
  })

  describe('withAuth HOC', () => {
    it('should render wrapped component when authenticated with admin role', async () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin', is_staff: true, is_superuser: true }),
      })

      const ProtectedPage = withAuth(DummyPage, 'admin')

      render(
        <AuthProvider>
          <ProtectedPage />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should redirect to login when not authenticated', async () => {
      const ProtectedPage = withAuth(DummyPage)

      render(
        <AuthProvider>
          <ProtectedPage />
        </AuthProvider>
      )

      await waitFor(() => {
        const { useRouter } = require('next/navigation')
        const mockUseRouter = useRouter as jest.Mock
        const lastCall = mockUseRouter.mock.results[mockUseRouter.mock.results.length - 1]
        expect(lastCall.value.push).toHaveBeenCalledWith('/admin/login')
      })
    })

    it('should redirect non-admin to login when admin role required', async () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'user', is_staff: false, is_superuser: false }),
      })

      const AdminPage = withAuth(DummyPage, 'admin')

      render(
        <AuthProvider>
          <AdminPage />
        </AuthProvider>
      )

      await waitFor(() => {
        const { useRouter } = require('next/navigation')
        const mockUseRouter = useRouter as jest.Mock
        const lastCall = mockUseRouter.mock.results[mockUseRouter.mock.results.length - 1]
        expect(lastCall.value.push).toHaveBeenCalledWith('/admin/login')
      })
    })

    it('should redirect non-superuser to /admin when superuser role required', async () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin', is_staff: true, is_superuser: false }),
      })

      const SuperPage = withAuth(DummyPage, 'superuser')

      render(
        <AuthProvider>
          <SuperPage />
        </AuthProvider>
      )

      await waitFor(() => {
        const { useRouter } = require('next/navigation')
        const mockUseRouter = useRouter as jest.Mock
        const lastCall = mockUseRouter.mock.results[mockUseRouter.mock.results.length - 1]
        expect(lastCall.value.push).toHaveBeenCalledWith('/admin')
      })
    })

    it('should show loading spinner while loading', () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin', is_staff: true, is_superuser: true }),
      })

      const ProtectedPage = withAuth(DummyPage)

      const { container } = render(
        <AuthProvider>
          <ProtectedPage />
        </AuthProvider>
      )

      // Should show spinner (animate-spin) while loading
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('useAuth hook', () => {
    it('should throw when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

      function BadComponent() {
        useAuth()
        return null
      }

      expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider')
      spy.mockRestore()
    })
  })
})
