import type { ReactNode } from 'react'

/**
 * Admin page heading with an optional right-side action (plan §6.H).
 * Shared by AdminListPage and the dashboard.
 */
export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  )
}
