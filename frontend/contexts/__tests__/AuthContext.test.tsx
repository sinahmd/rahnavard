import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock fetch (the tests exercise the real production path: AuthContext →
// lib/api/auth → lib/api/http → fetch).
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage so we can assert the one-time purge and the absence of
// any credential writes.
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

// http.ts redirects on 401; stub it so no navigation happens in jsdom.
const assignMock = jest.fn()
Object.defineProperty(window, 'location', {
  value: { pathname: '/admin/cars', assign: assignMock },
  configurable: true,
  writable: true,
})

const adminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  first_name: '',
  last_name: '',
  is_staff: true,
  is_superuser: true,
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
}

const okJson = (payload: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => payload,
})

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, login, logout, refreshUser, isAuthenticated, isAdmin, isSuperUser } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="admin">{isAdmin.toString()}</div>
      <div data-testid="superuser">{isSuperUser.toString()}</div>
      <div data-testid="user">{user?.username || 'no-user'}</div>
      <button
        onClick={async () => {
          try {
            await login('admin', 'secret')
          } catch {
            // login failures are rendered by the login page, not here
          }
        }}
      >
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => refreshUser()}>Refresh</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    assignMock.mockClear()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  it('never touches localStorage during session bootstrap (legacy key preserved until cutover)', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ detail: 'Not authenticated.' }, 401))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Dual mode keeps the legacy admin_token key untouched for rollback: no
    // reads, writes, or removals of credentials. Session lives in the
    // httpOnly cookie; nothing is ever stored by the client.
    expect(localStorageMock.getItem).not.toHaveBeenCalled()
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
    expect(localStorageMock.removeItem).not.toHaveBeenCalled()
  })

  it('should provide unauthenticated state when the session is missing', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ detail: 'Not authenticated.' }, 401))

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
    // Expired/missing session → transport redirects to the login page.
    expect(assignMock).toHaveBeenCalledWith('/admin/login')
  })

  it('should restore the user from the session cookie on mount', async () => {
    mockFetch.mockResolvedValueOnce(okJson(adminUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('admin')
    expect(screen.getByTestId('admin')).toHaveTextContent('true')
    expect(screen.getByTestId('superuser')).toHaveTextContent('true')
    // Bootstrap went to the session endpoint — no token involved.
    const calledUrl = String(mockFetch.mock.calls[0][0])
    expect(calledUrl).toContain('/auth/session/')
  })

  it('should handle login and rely on the session cookie (no token stored)', async () => {
    // Mount bootstrap: no session yet.
    mockFetch.mockResolvedValueOnce(okJson({ detail: 'Not authenticated.' }, 401))
    // Login: backend still returns { token, user } during dual-mode; the
    // client must ignore the token.
    mockFetch.mockResolvedValueOnce(okJson({ token: 'legacy-dual-mode-token', user: adminUser }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('admin')
    })

    // The dual-mode token in the response is never persisted anywhere.
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('should handle login failure', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ detail: 'Not authenticated.' }, 401))
    mockFetch.mockResolvedValueOnce(okJson({ detail: 'Invalid credentials.' }, 400))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByText('Login'))

    // After a failed login the user stays logged out.
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('should handle logout (session destroyed server-side, state cleared)', async () => {
    mockFetch.mockResolvedValueOnce(okJson(adminUser))
    mockFetch.mockResolvedValueOnce(okJson({ message: 'Successfully logged out.' }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })

  it('should handle logout API failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce(okJson(adminUser))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
    // Local state is cleared regardless of the API failure — but the legacy
    // token key is never touched during dual mode.
    expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('should handle refreshUser re-fetching the session', async () => {
    mockFetch.mockResolvedValueOnce(okJson(adminUser))
    mockFetch.mockResolvedValueOnce(okJson({ ...adminUser, email: 'new@example.com' }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
  })

  it('should stay unauthenticated on a network failure during bootstrap', async () => {
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
    // Network failure is not a 401 → no redirect to login.
    expect(assignMock).not.toHaveBeenCalled()
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
