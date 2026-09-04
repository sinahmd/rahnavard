'use client'

import { AuthProvider } from '@/contexts/AuthContext'

/**
 * Providers-only admin layout (Phase 3). AuthProvider wraps the whole
 * /admin subtree so BOTH the login page and the protected shell can use
 * useAuth() — the guard itself lives one level deeper in
 * admin/(protected)/layout.tsx, which is why /admin/login (a sibling of
 * (protected)) never passes through it.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}