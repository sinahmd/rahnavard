'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useModalA11y } from '@/components/ui/useModalA11y'

const sidebarLinks = [
  { href: '/admin', label: 'داشبورد', icon: '📊' },
  { href: '/admin/cars', label: 'خودروها', icon: '🚗' },
  { href: '/admin/articles', label: 'مقالات', icon: '📝' },
  { href: '/admin/branches', label: 'شعب', icon: '📍' },
  { href: '/admin/hero-slides', label: 'اسلایدها', icon: '🖼️' },
  { href: '/admin/why-rahnavard', label: 'بخش چرا راهنورد', icon: '✨' },
  { href: '/admin/inquiries', label: 'استعلام‌ها', icon: '💬' },
  { href: '/admin/settings', label: 'تنظیمات سایت', icon: '⚙️' },
]

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href))
}

/**
 * Navigation list shared by the desktop sidebar and the mobile drawer —
 * one source of truth for links, active states and tap targets.
 */
function NavLinks({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string
  onNavigate?: () => void
  collapsed?: boolean
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-3" aria-label="ناوبری پنل مدیریت">
      <ul className="space-y-1">
        {sidebarLinks.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? link.label : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-lg p-3 transition-colors ${
                  active
                    ? 'bg-accent font-bold text-dark'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <span className="shrink-0 text-xl" aria-hidden="true">
                  {link.icon}
                </span>
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function UserCard({
  user,
  isSuperUser,
  collapsed = false,
}: {
  user: { first_name?: string; last_name?: string; username?: string } | null
  isSuperUser: boolean
  collapsed?: boolean
}) {
  return (
    <div className={`border-b p-4 ${collapsed ? 'px-2 text-center' : ''}`}>
      <div
        className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
          <span className="font-bold text-dark">
            {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase()}
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
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
  )
}

function SidebarFooter({
  logout,
  isSuperUser,
  onNavigate,
  collapsed = false,
}: {
  logout: () => void
  isSuperUser: boolean
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const itemClass =
    'flex min-h-[44px] items-center gap-2 rounded-lg p-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-dark'
  return (
    <div className="space-y-1 border-t p-3">
      {isSuperUser && (
        <Link
          href="/django-admin/"
          onClick={onNavigate}
          className={`${itemClass} ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'مدیریت پیشرفته' : undefined}
        >
          <span aria-hidden="true">🔧</span>
          {!collapsed && <span>مدیریت پیشرفته</span>}
        </Link>
      )}
      <Link
        href="/"
        onClick={onNavigate}
        className={`${itemClass} ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? 'مشاهده سایت' : undefined}
      >
        <span aria-hidden="true">🏠</span>
        {!collapsed && <span>مشاهده سایت</span>}
      </Link>
      <button
        onClick={logout}
        className={`w-full text-red-600 hover:bg-red-50 hover:text-red-700 ${itemClass} ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? 'خروج' : undefined}
      >
        <span aria-hidden="true">🚪</span>
        {!collapsed && <span>خروج</span>}
      </button>
    </div>
  )
}

/**
 * Guard + shell for all authenticated admin routes (Phase 3).
 * Lives under admin/(protected)/ so /admin/login — a sibling of this route
 * group — is structurally outside the guard: no pathname special cases,
 * the redirect effect only ever runs for protected pages.
 *
 * Responsive shell: below lg the navigation is an overlay drawer opened
 * from the topbar hamburger; at lg+ it is the classic collapsible sidebar
 * whose toggle lives in the topbar (always reachable — the old sidebar
 * buried its own toggle inside itself, unreachable whenever it was hidden).
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, loading, logout, isSuperUser } = useAuth()

  // Auth guard — unchanged contract.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, loading, router])

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isDrawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isDrawerOpen])

  // Drawer focus behavior: focus moves to the drawer's close button on
  // open (inside the dialog), Escape closes, Tab is trapped, and focus
  // returns to the hamburger on close (via previous-focus restore).
  useModalA11y({
    isOpen: isDrawerOpen,
    onClose: () => setIsDrawerOpen(false),
    containerRef: drawerRef,
    initialFocusRef: drawerCloseRef,
  })

  // Show loading state while the session is being restored.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent"></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated.
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar (lg+) */}
      <aside
        className={`fixed top-0 right-0 z-40 hidden h-full flex-col bg-white shadow-lg transition-all duration-300 lg:flex ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex min-h-[64px] items-center justify-between gap-2 border-b p-4">
          {isSidebarCollapsed ? (
            <span className="text-xl font-black text-dark" aria-hidden="true">
              ر
            </span>
          ) : (
            <h1 className="text-lg font-bold">پنل مدیریت</h1>
          )}
          <button
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            aria-label={isSidebarCollapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'}
            aria-pressed={isSidebarCollapsed}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <span aria-hidden="true">{isSidebarCollapsed ? '☰' : '✕'}</span>
          </button>
        </div>

        <UserCard user={user} isSuperUser={isSuperUser} collapsed={isSidebarCollapsed} />

        <NavLinks pathname={pathname} collapsed={isSidebarCollapsed} />

        <SidebarFooter
          logout={logout}
          isSuperUser={isSuperUser}
          collapsed={isSidebarCollapsed}
        />
      </aside>

      {/* Mobile drawer (<lg) */}
      <div
        id="admin-mobile-drawer"
        className={`fixed inset-0 z-50 lg:hidden ${
          isDrawerOpen ? '' : 'pointer-events-none'
        }`}
        aria-hidden={!isDrawerOpen}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100' : 'invisible opacity-0'
          }`}
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="منوی پنل مدیریت"
          className={`absolute top-0 right-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0' : 'invisible translate-x-full'
          }`}
        >
          <div className="flex min-h-[64px] items-center justify-between border-b p-4">
            <h1 className="text-lg font-bold">پنل مدیریت</h1>
            <button
              ref={drawerCloseRef}
              onClick={() => setIsDrawerOpen(false)}
              aria-label="بستن منو"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <UserCard user={user} isSuperUser={isSuperUser} />

          <NavLinks pathname={pathname} onNavigate={() => setIsDrawerOpen(false)} />

          <SidebarFooter
            logout={logout}
            isSuperUser={isSuperUser}
            onNavigate={() => setIsDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Main content — full width on mobile, sidebar offset at lg+ */}
      <main
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              {/* Mobile hamburger */}
              <button
                ref={menuButtonRef}
                onClick={() => setIsDrawerOpen(true)}
                aria-label="باز کردن منو"
                aria-haspopup="dialog"
                aria-expanded={isDrawerOpen}
                aria-controls="admin-mobile-drawer"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
              >
                <span aria-hidden="true" className="text-xl">
                  ☰
                </span>
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setIsSidebarCollapsed((v) => !v)}
                aria-label={isSidebarCollapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'}
                aria-pressed={isSidebarCollapsed}
                className="hidden h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 lg:flex"
              >
                <span aria-hidden="true" className="text-xl">
                  ☰
                </span>
              </button>
              <h2 className="truncate text-base font-bold md:text-lg">
                پنل مدیریت راهنورد خودرو
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:gap-4">
              <span className="hidden text-sm text-gray-600 md:inline">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={logout}
                className="min-h-[44px] rounded-lg bg-gray-100 px-3 text-sm transition-colors hover:bg-gray-200 md:px-4"
              >
                خروج
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
