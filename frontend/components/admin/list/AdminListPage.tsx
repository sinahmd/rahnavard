'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ApiRequestError } from '@/lib/api/http'
import type { Paginated } from '@/types/api'
import PageHeader from '@/components/admin/ui/PageHeader'
import ErrorState from '@/components/admin/ui/ErrorState'
import EmptyState from '@/components/admin/ui/EmptyState'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'

/** Helpers passed to column cells so row actions can refresh / surface errors. */
export interface AdminListHelpers {
  /** Reload the current page (after a successful mutation). */
  refresh: () => void
  /** Surface an action failure in the page-level alert banner. */
  error: (message: string) => void
  /**
   * Accessible confirm (replaces window.confirm). Resolves true only when
   * the user confirms; focus is managed by the ConfirmDialog.
   */
  confirm: (description: string) => Promise<boolean>
}

export interface AdminListColumn<T> {
  header: string
  className?: string
  cell: (row: T, helpers: AdminListHelpers) => ReactNode
}

interface AdminListPageProps<T> {
  title: string
  columns: AdminListColumn<T>[]
  fetchPage: (page: number) => Promise<Paginated<T>>
  rowKey: (row: T) => string | number
  /** Optional "create" link rendered in the header. */
  createHref?: string
  createLabel?: string
  /** Empty-state message shown when the current page has no rows. */
  emptyMessage: string
  /** Load-failure message shown in the alert banner. */
  errorMessage: string
}

const DEFAULT_PAGE_SIZE = 20

/**
 * Shared paginated admin table (Phase 4). Owns fetch state, loading,
 * error/retry, empty state, and pagination driven by the backend envelope
 * (`count` / `page_size` / `results`). Column cells receive `helpers` so
 * entity pages can keep row actions (toggles, delete) in one place while the
 * list shell stays generic — no CRUD framework.
 */
export default function AdminListPage<T>({
  title,
  columns,
  fetchPage,
  rowKey,
  createHref,
  createLabel,
  emptyMessage,
  errorMessage,
}: AdminListPageProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingConfirm, setPendingConfirm] = useState<
    { description: string; resolve: (confirmed: boolean) => void } | null
  >(null)

  const load = useCallback(
    async (pageNumber: number) => {
      try {
        setError(null)
        setLoading(true)
        const result = await fetchPage(pageNumber)
        // Out-of-range correction: deleting the last row of the last page.
        // Land on the NEW last valid page derived from count/page_size, not
        // page 1 — the user's context is the end of the list.
        if (pageNumber > 1 && result.count > 0 && result.results.length === 0) {
          const size = result.page_size ?? DEFAULT_PAGE_SIZE
          setPage(Math.max(1, Math.ceil(result.count / size)))
          return
        }
        setRows(result.results)
        setCount(result.count)
        setPageSize(result.page_size ?? DEFAULT_PAGE_SIZE)
      } catch (err) {
        // A page that no longer exists (race between delete and refetch)
        // falls back to the previous page instead of a dead error screen.
        const status = (err as ApiRequestError | undefined)?.status
        if (status === 404 && pageNumber > 1) {
          setPage((p) => p - 1)
          return
        }
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [fetchPage, errorMessage]
  )

  useEffect(() => {
    void load(page)
  }, [page, reloadKey, load])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])
  const reportError = useCallback((message: string) => setError(message), [])
  const confirm = useCallback(
    (description: string) =>
      new Promise<boolean>((resolve) => setPendingConfirm({ description, resolve })),
    []
  )
  // Stable settle handlers: ConfirmDialog's effect deps stay identity-stable.
  const settleConfirm = useCallback(
    (confirmed: boolean) =>
      setPendingConfirm((pending) => {
        pending?.resolve(confirmed)
        return null
      }),
    []
  )

  const totalPages = Math.max(1, Math.ceil(count / Math.max(1, pageSize)))
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div>
      <PageHeader
        title={title}
        action={
          createHref ? (
            <Link
              href={createHref}
              className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors"
            >
              {createLabel || '+ جدید'}
            </Link>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {loading && rows.length === 0 ? (
        <div className="text-center py-8">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-gray-50">
              <tr className="text-right">
                {columns.map((col) => (
                  <th key={col.header} scope="col" className={`p-4 font-bold ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-4">
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={rowKey(row)} className="border-t hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col.header} className={`p-4 ${col.className || ''}`}>
                        {col.cell(row, { refresh, error: reportError, confirm })}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <ConfirmDialog
            open={!!pendingConfirm}
            title="تأیید حذف"
            description={pendingConfirm?.description ?? ''}
            confirmLabel="حذف"
            onConfirm={() => settleConfirm(true)}
            onCancel={() => settleConfirm(false)}
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
              <span className="text-gray-600">
                نمایش {rows.length} از {count}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="صفحه قبلی"
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 font-bold"
                >
                  قبلی
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-label={`صفحه ${n}`}
                    aria-current={n === page ? 'page' : undefined}
                    className={`w-8 h-8 rounded font-bold ${
                      n === page ? 'bg-accent text-dark' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="صفحه بعدی"
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 font-bold"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
