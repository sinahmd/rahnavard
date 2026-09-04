'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

const sidebarLinks = [
  { href: '/admin', label: 'داشبورد', icon: '📊' },
  { href: '/admin/cars', label: 'خودروها', icon: '🚗' },
  { href: '/admin/articles', label: 'مقالات', icon: '📝' },
  { href: '/admin/branches', label: 'شعب', icon: '📍' },
  { href: '/admin/hero-slides', label: 'اسلایدها', icon: '🖼️' },
  { href: '/admin/features', label: 'ویژگی‌ها', icon: '✨' },
  { href: '/admin/inquiries', label: 'استعلام‌ها', icon: '💬' },
  { href: '/admin/settings', label: 'تنظیمات سایت', icon: '⚙️' },
]

/**
 * Auth is scoped to the admin subtree (Phase 2 regression fix): AuthProvider
 * wraps only /admin routes, so public pages never bootstrap /auth/session/
 * and anonymous visitors are never redirected to /admin/login. This is an
 * early, targeted version of the Phase 3 admin/(protected) boundary — the
 * guard and sidebar below behave exactly as before.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  )
}

function AdminShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, loading, logout, isSuperUser } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [isAuthenticated, loading, pathname, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  // Show login page without admin layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full bg-white shadow-lg transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 border-b">
          <h1 className={`font-bold text-xl ${isSidebarOpen ? 'block' : 'hidden'}`}>
            پنل مدیریت
          </h1>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full text-right p-2 hover:bg-gray-100 rounded"
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            {isSidebarOpen && (
              <div>
                <p className="font-medium text-sm">
                  {user?.first_name
                    ? `${user.first_name} ${user.last_name || ''}`
                    : user?.username}
                </p>
                <p className="text-xs text-gray-500">
                  {isSuperUser ? 'مدیر ارشد' : 'مدیر محتوا'}
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    (pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href)))
                      ? 'bg-accent text-dark font-bold'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  {isSidebarOpen && <span>{link.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t space-y-2">
          {isSuperUser && (
            <Link
              href="/django-admin/"
              className="flex items-center gap-2 text-gray-600 hover:text-dark transition-colors text-sm"
            >
              <span>🔧</span>
              {isSidebarOpen && <span>مدیریت پیشرفته</span>}
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-dark transition-colors text-sm"
          >
            <span>🏠</span>
            {isSidebarOpen && <span>مشاهده سایت</span>}
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors text-sm"
          >
            <span>🚪</span>
            {isSidebarOpen && <span>خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'mr-64' : 'mr-20'
        }`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">پنل مدیریت راهنورد خودرو</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={logout}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                خروج
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
