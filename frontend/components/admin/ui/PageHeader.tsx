import type { ReactNode } from 'react'

/**
 * Admin page heading with an optional right-side action (plan §6.H).
 * Shared by AdminListPage and the dashboard. On mobile the action wraps
 * below the title instead of squeezing one line, and the title drops a
 * size step to preserve content width.
 */
export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
      <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
      {action}
    </div>
  )
}
