'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CarCard from '@/components/car/CarCard'
import CarSearchBar from '@/components/car/CarSearchBar'
import CarFilters, { FilterOptions, FilterState } from '@/components/car/CarFilters'
import ActiveFilters from '@/components/car/ActiveFilters'
import CarPagination from '@/components/car/CarPagination'
import { SORT_OPTIONS } from '@/lib/carConstants'
import {
  parseCarListQuery,
  buildCarListQuery,
  EMPTY_CAR_FILTERS,
  type CarListQuery,
} from '@/lib/data/listQuery'
import type { CarListItem } from '@/types/car'
import type { Paginated } from '@/types/api'

const DEFAULT_PAGE_SIZE = 20

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  brands: [],
  body_types: [],
  fuel_types: [],
  transmissions: [],
  min_year: null,
  max_year: null,
  min_price: null,
  max_price: null,
}

export interface CarsExplorerProps {
  /**
   * Server-rendered snapshot (Phase 3 Step B): the parsed query the shell
   * rendered with, the matching first page, and the filter options. The
   * island skips its initial fetch when the current URL query equals
   * `initialQuery` — hydration starts from identical HTML.
   */
  initialQuery?: CarListQuery
  initialData?: Paginated<CarListItem> | null
  initialFilterOptions?: FilterOptions | null
}

export default function CarsExplorer({
  initialQuery,
  initialData = null,
  initialFilterOptions = null,
}: CarsExplorerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  // Canonical listing state: derived from the URL every render. No
  // useState mirrors of search/filters/page/sort (§6.C.1).
  const query = parseCarListQuery(searchParams)

  // One-shot skip of the duplicate initial fetch when the URL equals the
  // server snapshot we were rendered with.
  const skipInitialFetch = useRef(
    initialQuery !== undefined &&
      JSON.stringify(parseCarListQuery(searchParams)) === JSON.stringify(initialQuery)
  )

  // Server-state mirror (starts from the server snapshot when provided).
  const [data, setData] = useState<Paginated<CarListItem> | null>(initialData)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(
    initialFilterOptions ?? EMPTY_FILTER_OPTIONS
  )
  // Without a server snapshot the first fetch runs on mount, so start in
  // the loading state to show the skeleton immediately (matches the old page).
  const [loading, setLoading] = useState(initialData === null)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(initialData !== null)
  const [retryCount, setRetryCount] = useState(0)

  // Transient UI state only.
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const cars = data?.results ?? []
  const totalCount = data?.count ?? 0
  const pageSize = data?.page_size ?? DEFAULT_PAGE_SIZE
  const totalPages = Math.ceil(totalCount / pageSize)

  // Interactions mutate the URL — router.replace preserved (back/forward
  // leave the listing rather than stepping through every filter combo).
  const updateUrl = useCallback(
    (next: CarListQuery) => {
      const qs = buildCarListQuery(next, 'sort')
      router.replace(`/cars${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router]
  )

  // Filter options: fetched once on mount when the server did not provide
  // them (Step A fallback — the shell passes them from Phase 3 Step B).
  const filterOptionsLoaded = useRef(false)
  useEffect(() => {
    if (filterOptionsLoaded.current || filterOptions.brands.length > 0) return
    const controller = new AbortController()
    fetch('/api/v1/cars/filters/', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((fetched) => {
        if (fetched) {
          setFilterOptions(fetched)
          filterOptionsLoaded.current = true
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [filterOptions.brands.length])

  // Fetch cars — reacts to URL changes only. Abort + race protection and
  // stale-while-revalidate UX preserved from the pre-refactor page.
  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const qs = buildCarListQuery(query, 'ordering')
    fetch(`/api/v1/cars/${qs ? `?${qs}` : ''}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('خطا در دریافت اطلاعات')
        return res.json() as Promise<Paginated<CarListItem>>
      })
      .then((fetched) => {
        const count = fetched.count || 0
        const size = fetched.page_size || DEFAULT_PAGE_SIZE
        setData(fetched)
        // Out-of-range page correction — one-direction URL replace, no loop.
        if (count > 0 && query.page > Math.ceil(count / size)) {
          updateUrl({ ...query, page: 1 })
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('خطا در بارگذاری خودروها. لطفاً دوباره تلاش کنید.')
          setData(null)
        }
      })
      .finally(() => {
        setLoading(false)
        setInitialized(true)
      })

    return () => controller.abort()
  }, [searchParams, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback(
    (value: string) => updateUrl({ ...query, search: value, page: 1 }),
    [query, updateUrl]
  )

  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => updateUrl({ ...query, filters: newFilters, page: 1 }),
    [query, updateUrl]
  )

  const handlePageChange = useCallback(
    (newPage: number) => updateUrl({ ...query, page: newPage }),
    [query, updateUrl]
  )

  const handleSortChange = useCallback(
    (value: string) => updateUrl({ ...query, sort: value, page: 1 }),
    [query, updateUrl]
  )

  const handleClearAll = useCallback(() => {
    updateUrl({ search: '', filters: { ...EMPTY_CAR_FILTERS }, page: 1, sort: '' })
  }, [updateUrl])

  const handleRetry = useCallback(() => {
    setError(null)
    setRetryCount((c) => c + 1)
  }, [])

  const activeFilterCount =
    Object.values(query.filters).filter((v) => v !== '').length + (query.search ? 1 : 0)

  return (
    <>
      <main id="main-content" className="pt-28 pb-20">
        <div className="wrap">
          {/* Page Header */}
          <div className="mb-8">
            <span className="eyebrow">محصولات</span>
            <h1 className="section-title">خودروهای ما</h1>
            <p className="text-gray">
              مجموعه‌ای از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی
              رسمی.
            </p>
          </div>

          {/* Search Bar + Mobile Filter Toggle */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <CarSearchBar value={query.search} onChange={handleSearchChange} />
            </div>
            <button
              ref={filterButtonRef}
              onClick={() => setFilterDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-xl border-[1.5px] border-gray-light bg-white text-[14px] font-bold text-dark hover:border-accent transition-colors shrink-0"
              aria-label="باز کردن فیلترها"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              فیلتر
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-accent text-dark text-[11px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filters + Sort Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <ActiveFilters
              filters={query.filters}
              onChange={handleFiltersChange}
              search={query.search}
              onSearchChange={handleSearchChange}
            />

            {/* Sort control */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="car-sort"
                className="text-[13px] text-gray font-medium hidden sm:block"
              >
                مرتب‌سازی:
              </label>
              <select
                id="car-sort"
                value={query.sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="border-[1.5px] border-gray-light rounded-lg px-3 py-2 text-[13px] bg-white text-dark outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main layout: sidebar + results */}
          <div className="flex gap-8">
            {/* Filters sidebar */}
            <CarFilters
              options={filterOptions}
              filters={query.filters}
              onChange={handleFiltersChange}
              resultCount={totalCount}
              isOpen={filterDrawerOpen}
              onClose={() => {
                setFilterDrawerOpen(false)
                filterButtonRef.current?.focus()
              }}
            />

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Loading skeleton — only on initial load (no cars yet) */}
              {loading && cars.length === 0 && (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  role="status"
                  aria-label="در حال بارگذاری"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[14px] shadow-card overflow-hidden animate-pulse"
                    >
                      <div className="w-full aspect-[4/3] bg-gray-200" />
                      <div className="p-5 space-y-3">
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
                        <div className="h-5 bg-gray-200 rounded w-24 mx-auto" />
                        <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
                        <div className="h-10 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="text-center py-16" role="alert">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-gray font-medium mb-4">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="btn btn-primary text-[14px]"
                  >
                    تلاش مجدد
                  </button>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && initialized && cars.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-5 bg-gray-light rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-gray-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-dark mb-2">
                    خودرویی یافت نشد
                  </h2>
                  <p className="text-gray mb-6 max-w-[360px] mx-auto">
                    با فیلترهای انتخاب‌شده خودرویی پیدا نشد. فیلترها را تغییر
                    دهید یا جستجو را پاک کنید.
                  </p>
                  <button
                    onClick={handleClearAll}
                    className="btn btn-primary text-[14px]"
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              )}

              {/* Results — show even while loading (stale-while-revalidate) */}
              {!error && cars.length > 0 && (
                <>
                  {/* Stale-while-revalidate: subtle spinner when loading new page */}
                  {loading && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                    </div>
                  )}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {cars.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                  <CarPagination
                    currentPage={query.page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}