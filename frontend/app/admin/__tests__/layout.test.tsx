/**
 * Phase 3 route structure: app/admin/layout.tsx is a providers-only shell
 * (AuthProvider) with NO guard. The guard moved to
 * app/admin/(protected)/layout.tsx. This test proves the shell only wraps
 * children and never redirects on its own — login and protected pages both
 * need useAuth(), which is why the provider lives here.
 *
 * The AuthProvider bootstrap fetches /auth/session/ on mount; the test
 * resolves it (logged-out 401) and settles the provider inside act so no
 * state update lands after the test finishes.
 */
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import AdminLayout from '../layout'

const pushMock = jest.fn()
const assignMock = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })
  ;(usePathname as jest.Mock).mockReturnValue('/admin/login')
  // http.ts redirects on 401; stub it so no navigation happens in jsdom.
  Object.defineProperty(window, 'location', {
    value: { pathname: '/admin/login', assign: assignMock },
    configurable: true,
    writable: true,
  })
  // Logged-out bootstrap: the session endpoint 401s and the provider lands
  // on an anonymous user deterministically.
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ detail: 'Authentication credentials were not provided.' }),
  })
})

describe('AdminLayout (providers-only shell)', () => {
  it('renders children inside the AuthProvider without any guard redirect', async () => {
    render(
      <AdminLayout>
        <div>login or protected content</div>
      </AdminLayout>
    )

    expect(screen.getByText('login or protected content')).toBeInTheDocument()

    // Let the auth bootstrap (401 → anonymous) settle while mounted.
    await act(async () => {})
    await act(async () => {})

    expect(pushMock).not.toHaveBeenCalled()
    expect(assignMock).not.toHaveBeenCalled()
  })
})
