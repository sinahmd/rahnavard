/**
 * Tests for the shared paginated admin table (Phase 4). `fetchPage` is a
 * prop, so each test injects a jest.fn directly — no module mocking. Covers
 * the pagination contract the entity pages rely on: envelope-derived page
 * count, out-of-range/404 fallbacks, error retry, and the row-action
 * `helpers` (refresh / error).
 */

import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminListPage from '../AdminListPage'
import type { Paginated } from '@/types/api'

interface Row {
  id: number
  name: string
}

const row = (id: number): Row => ({ id, name: `ردیف ${id}` })

const pageOf = (ids: number[], count: number, pageSize = 20): Paginated<Row> => ({
  count,
  next: null,
  previous: null,
  page_size: pageSize,
  results: ids.map(row),
})

const renderList = (fetchPage: (page: number) => Promise<Paginated<Row>>) =>
  render(
    <AdminListPage<Row>
      title="مدیریت آزمون"
      fetchPage={fetchPage}
      rowKey={(r) => r.id}
      emptyMessage="چیزی وجود ندارد"
      errorMessage="خطا در بارگذاری"
      columns={[
        { header: 'نام', cell: (r) => r.name },
        {
          header: 'عملیات',
          cell: (r, helpers) => (
            <div>
              <button onClick={() => helpers.refresh()}>{`به‌روزرسانی ${r.id}`}</button>
              <button onClick={() => helpers.error('خطای ردیف')}>{`خطا ${r.id}`}</button>
            </div>
          ),
        },
      ]}
    />
  )

describe('AdminListPage', () => {
  it('renders rows and headers from the first page', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1, 2], 2))
    renderList(fetchPage)

    expect(await screen.findByText('ردیف 1')).toBeInTheDocument()
    expect(screen.getByText('ردیف 2')).toBeInTheDocument()
    expect(screen.getByText('نام')).toBeInTheDocument()
    expect(fetchPage).toHaveBeenCalledWith(1)
  })

  it('shows the empty state when the page has no rows', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([], 0))
    renderList(fetchPage)
    expect(await screen.findByText('چیزی وجود ندارد')).toBeInTheDocument()
  })

  it('announces the loading state to assistive tech', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1], 1))
    renderList(fetchPage)
    // Shown on first paint, before the fetch resolves.
    expect(screen.getByRole('status')).toHaveTextContent('در حال بارگذاری...')
    // Settle the fetch chain inside act so no state update leaks past the test.
    await waitFor(() => expect(screen.getByText('ردیف 1')).toBeInTheDocument())
  })

  it('gives the table a caption and column-header scope', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1], 1))
    const { container } = renderList(fetchPage)
    await screen.findByText('ردیف 1')

    expect(container.querySelector('caption')).toHaveTextContent('مدیریت آزمون')
    screen.getAllByRole('columnheader').forEach((th) =>
      expect(th).toHaveAttribute('scope', 'col')
    )
  })

  it('shows the error banner with retry and refetches on retry', async () => {
    const fetchPage = jest
      .fn()
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(pageOf([1], 1))
    renderList(fetchPage)

    expect(await screen.findByRole('alert')).toHaveTextContent('خطا در بارگذاری')
    fireEvent.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(await screen.findByText('ردیف 1')).toBeInTheDocument()
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('derives page count from the envelope and navigates pages', async () => {
    // 45 rows at page_size 20 → 3 pages.
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1, 2], 45))
    renderList(fetchPage)
    await screen.findByText('ردیف 1')

    expect(screen.getByText('نمایش 2 از 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'صفحه 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'صفحه قبلی' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'صفحه بعدی' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'صفحه 1' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    fireEvent.click(screen.getByRole('button', { name: 'صفحه بعدی' }))
    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(2))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'صفحه 2' })).toHaveAttribute('aria-current', 'page')
    )

    fireEvent.click(screen.getByRole('button', { name: 'صفحه قبلی' }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(1))
  })

  it('lands on the last valid page when a page beyond the data comes back empty', async () => {
    // 45 rows → 3 pages. Deleting the last row of page 3 leaves 40 rows →
    // 2 pages, so the empty page-3 response must land the user on page 2.
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(pageOf([1, 2], 45))
      .mockResolvedValueOnce({ count: 40, next: null, previous: null, results: [] })
      .mockResolvedValueOnce(pageOf([21], 40))
    renderList(fetchPage)
    await screen.findByText('ردیف 1')

    fireEvent.click(screen.getByRole('button', { name: 'صفحه 3' }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(2))
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 3, 2])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('falls back to the previous page when a higher page 404s', async () => {
    const firstPage = pageOf([1], 21)
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce(firstPage)
    renderList(fetchPage)
    await screen.findByText('ردیف 1')

    fireEvent.click(screen.getByRole('button', { name: 'صفحه 2' }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(1))
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 1])
    // The 404 fallback is not surfaced as an error.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('helpers.error surfaces a row-action failure in the banner', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1], 1))
    renderList(fetchPage)

    fireEvent.click(await screen.findByText('خطا 1'))
    expect(await screen.findByRole('alert')).toHaveTextContent('خطای ردیف')
  })

  it('helpers.refresh reloads the current page', async () => {
    const fetchPage = jest.fn().mockResolvedValue(pageOf([1], 1))
    renderList(fetchPage)

    fireEvent.click(await screen.findByText('به‌روزرسانی 1'))
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2))
    expect(fetchPage).toHaveBeenLastCalledWith(1)
  })
})
