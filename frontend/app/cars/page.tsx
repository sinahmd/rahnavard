'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CarCard from '@/components/car/CarCard'
import CarSearchBar from '@/components/car/CarSearchBar'
import CarFilters, { FilterOptions, FilterState } from '@/components/car/CarFilters'
import ActiveFilters from '@/components/car/ActiveFilters'
import CarPagination from '@/components/car/CarPagination'
import { SORT_OPTIONS } from '@/lib/carConstants'
import { apiUrl } from '@/lib/apiUrl'

const PAGE_SIZE = 20

const EMPTY_FILTERS: FilterState = {
  brand: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  min_year: '',
  max_year: '',
  min_price: '',
  max_price: '',
}

interface Car {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  year: number
  fuel_type: string
  fuel_type_display: string
  transmission: string
  transmission_display: string
  price: string | null
  body_type: string
  engine: string
  main_image: string
  is_featured: boolean
}

function readStateFromURL(params: URLSearchParams) {
  return {
    search: params.get('search') || '',
    filters: {
      brand: params.get('brand') || '',
      fuel_type: params.get('fuel_type') || '',
      transmission: params.get('transmission') || '',
      body_type: params.get('body_type') || '',
      min_year: params.get('min_year') || '',
      max_year: params.get('max_year') || '',
      min_price: params.get('min_price') || '',
      max_price: params.get('max_price') || '',
    },
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
    sort: params.get('sort') || '',
  }
}

function buildQueryString(
  search: string,
  filters: FilterState,
  page: number,
  sort: string
): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  if (sort) params.set('sort', sort)
  if (page > 1) params.set('page', String(page))
  return params.toString()
}

/** Build the /api/v1/cars/?... query string from state. */
function buildApiQueryString(
  search: string,
  filters: FilterState,
  page: number,
  sort: string
): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  // Map UI sort values to API ordering
  if (sort) params.set('ordering', sort)
  if (page > 1) params.set('page', String(page))
  return params.toString()
}

export default function CarsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  // ── State from URL ──────────────────────────────────────────────────
  const urlState = readStateFromURL(searchParams)
  const [search, setSearch] = useState(urlState.search)
  const [filters, setFilters] = useState<FilterState>(urlState.filters)
  const [page, setPage] = useState(urlState.page)
  const [sort, setSort] = useState(urlState.sort)

  // ── Sync from URL on back/forward ──────────────────────────────────
  useEffect(() => {
    const fresh = readStateFromURL(searchParams)
    setSearch(fresh.search)
    setFilters(fresh.filters)
    setPage(fresh.page)
    setSort(fresh.sort)
  }, [searchParams])

  // ── Cars data ──────────────────────────────────────────────────────
  const [cars, setCars] = useState<Car[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filter options ─────────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brands: [],
    body_types: [],
    fuel_types: [],
    transmissions: [],
    min_year: null,
    max_year: null,
    min_price: null,
    max_price: null,
  })

  // ── Mobile filter drawer ──────────────────────────────────────────
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Fetch filter options once on mount
  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/v1/cars/filters/'), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setFilterOptions(data)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // ── Fetch cars ─────────────────────────────────────────────────────
  const fetchCars = useCallback(
    (
      s: string,
      f: FilterState,
      p: number,
      o: string,
      signal?: AbortSignal
    ) => {
      const qs = buildApiQueryString(s, f, p, o)
      const url = apiUrl(`/api/v1/cars/${qs ? `?${qs}` : ''}`)
      return fetch(url, { signal }).then(async (res) => {
        if (!res.ok) throw new Error('خطا در دریافت اطلاعات')
        return res.json()
      })
    },
    []
  )

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    fetchCars(search, filters, page, sort, controller.signal)
      .then((data) => {
        setCars(data.results || [])
        setTotalCount(data.count || 0)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('خطا در بارگذاری خودروها. لطفاً دوباره تلاش کنید.')
          setCars([])
          setTotalCount(0)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [search, filters, page, sort, fetchCars])

  // ── Push state to URL ──────────────────────────────────────────────
  useEffect(() => {
    const qs = buildQueryString(search, filters, page, sort)
    const url = `/cars${qs ? `?${qs}` : ''}`
    router.replace(url, { scroll: false })
  }, [search, filters, page, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSort(value)
    setPage(1)
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    setLoading(true)
    fetchCars(search, filters, page, sort)
      .then((data) => {
        setCars(data.results || [])
        setTotalCount(data.count || 0)
      })
      .catch(() => {
        setError('خطا در بارگذاری خودروها.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [search, filters, page, sort, fetchCars])

  const handleClearAll = useCallback(() => {
    setSearch('')
    setFilters(EMPTY_FILTERS)
    setSort('')
    setPage(1)
  }, [])

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== '').length + (search ? 1 : 0)

  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
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
              <CarSearchBar value={search} onChange={handleSearchChange} />
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
              filters={filters}
              onChange={handleFiltersChange}
              search={search}
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
                value={sort}
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
              filters={filters}
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
              {/* Loading */}
              {loading && (
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
              {!loading && !error && cars.length === 0 && (
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

              {/* Results */}
              {!loading && !error && cars.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cars.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                  <CarPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
