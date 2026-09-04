/**
 * Admin layout hosts AuthProvider (moved here from the root layout) and keeps
 * the existing guard: while the session is loading show the spinner; without a
 * session redirect to /admin/login; with a session render the shell.
 */
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import AdminLayout from '../layout'

const mockFetch = jest.fn()
const assignMock = jest.fn()
const pushMock = jest.fn()

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

const jsonResponse = (payload: unknown, status: number) => ({
  ok: status < 400,
  status,
  json: async () => payload,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockReset()
  global.fetch = mockFetch
  assignMock.mockClear()
  pushMock.mockClear()
  ;(useRouter as jest.Mock).mockReturnValue({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })
  ;(usePathname as jest.Mock).mockReturnValue('/admin/cars')
  Object.defineProperty(window, 'location', {
    value: { pathname: '/admin/cars', assign: assignMock },
    configurable: true,
    writable: true,
  })
})

describe('AdminLayout', () => {
  it('redirects an unauthenticated visitor to /admin/login (401 policy + guard)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not authenticated.' }, 401))

    render(
      <AdminLayout>
        <div>protected content</div>
      </AdminLayout>
    )

    // http.ts central 401 policy assigns to the login page.
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/admin/login'))
    // The layout guard also routes there once loading completes.
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin/login'))
    // Protected content is never shown.
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders the admin shell for an authenticated session', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(adminUser, 200))

    render(
      <AdminLayout>
        <div>protected content</div>
      </AdminLayout>
    )

    await waitFor(() => {
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })
    // Sidebar identity rendered from the session user.
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    expect(assignMock).not.toHaveBeenCalled()
  })
})
