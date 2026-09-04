/**
 * Phase 3 route structure: app/admin/layout.tsx is a providers-only shell
 * (AuthProvider) with NO guard. The guard moved to
 * app/admin/(protected)/layout.tsx. This test proves the shell only wraps
 * children and never redirects on its own — login and protected pages both
 * need useAuth(), which is why the provider lives here.
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import AdminLayout from '../layout'

const pushMock = jest.fn()

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
})

describe('AdminLayout (providers-only shell)', () => {
  it('renders children inside the AuthProvider without any guard redirect', () => {
    render(
      <AdminLayout>
        <div>login or protected content</div>
      </AdminLayout>
    )

    expect(screen.getByText('login or protected content')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})