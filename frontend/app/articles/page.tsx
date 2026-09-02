'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { apiUrl } from '@/lib/apiUrl'
import Pagination from '@/components/ui/Pagination'

const DEFAULT_PAGE_SIZE = 20

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string
  published_at: string
}

function readStateFromURL(params: URLSearchParams) {
  return {
    search: params.get('search') || '',
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  }
}

function buildUrlParams(search: string, page: number): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (page > 1) params.set('page', String(page))
  return params.toString()
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('fa-IR')
  } catch {
    return ''
  }
}

export default function ArticlesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)

  // ── State from URL ──────────────────────────────────────────────────
  const urlState = readStateFromURL(searchParams)
  const [search, setSearch] = useState(urlState.search)
  const [page, setPage] = useState(urlState.page)

  // ── Sync from URL on back/forward ──────────────────────────────────
  useEffect(() => {
    const fresh = readStateFromURL(searchParams)
    setSearch(fresh.search)
    setPage(fresh.page)
  }, [searchParams])

  // ── Articles data ──────────────────────────────────────────────────
  const [articles, setArticles] = useState<Article[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [retryCount, setRetryCount] = useState(0)

  const totalPages = Math.ceil(totalCount / pageSize)

  // ── Fetch articles ─────────────────────────────────────────────────
  const fetchArticles = useCallback(
    (s: string, p: number, signal?: AbortSignal) => {
      const qs = buildUrlParams(s, p)
      const url = apiUrl(`/api/v1/articles/${qs ? `?${qs}` : ''}`)
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

    fetchArticles(search, page, controller.signal)
      .then((data) => {
        const count = data.count || 0
        const size = data.page_size || pageSize
        setArticles(data.results || [])
        setTotalCount(count)
        if (data.page_size) setPageSize(data.page_size)
        // Redirect to page 1 if page > totalPages
        if (count > 0 && page > Math.ceil(count / size)) {
          setPage(1)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('خطا در بارگذاری مقالات. لطفاً دوباره تلاش کنید.')
          setArticles([])
          setTotalCount(0)
        }
      })
      .finally(() => {
        setLoading(false)
        setInitialized(true)
      })

    return () => controller.abort()
  }, [search, page, fetchArticles, retryCount])

  // ── Push state to URL ──────────────────────────────────────────────
  useEffect(() => {
    const qs = buildUrlParams(search, page)
    const url = `/articles${qs ? `?${qs}` : ''}`
    router.replace(url, { scroll: false })
  }, [search, page]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    setRetryCount((c) => c + 1)
  }, [])

  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <div className="wrap">
          {/* Page Header */}
          <div className="mb-8">
            <span className="eyebrow">اخبار</span>
            <h1 className="section-title">مقاله و اطلاعیه</h1>
            <p className="text-gray">
              آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 max-w-[480px]">
            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="جستجوی مقاله..."
                aria-label="جستجوی مقاله"
                className="w-full pr-12 pl-10 py-3.5 rounded-xl border-[1.5px] border-gray-light bg-white text-[15px] font-vazir text-dark outline-none transition-colors focus:border-accent placeholder:text-gray/50"
                dir="rtl"
              />
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  aria-label="پاک کردن جستجو"
                >
                  <svg className="w-3.5 h-3.5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Loading skeleton — only on initial load */}
          {loading && articles.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="در حال بارگذاری">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[14px] shadow-card overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-20" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-16" role="alert">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-gray font-medium mb-4">{error}</p>
              <button onClick={handleRetry} className="btn btn-primary text-[14px]">
                تلاش مجدد
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && initialized && articles.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-5 bg-gray-light rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-dark mb-2">
                {search ? 'مقاله‌ای یافت نشد' : 'مقاله‌ای موجود نیست'}
              </h2>
              <p className="text-gray mb-6 max-w-[360px] mx-auto">
                {search
                  ? `نتیجه‌ای برای «${search}» یافت نشد. عبارت جستجو را تغییر دهید.`
                  : 'از پنل مدیریت مقاله اضافه کنید.'}
              </p>
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="btn btn-primary text-[14px]"
                >
                  پاک کردن جستجو
                </button>
              )}
            </div>
          )}

          {/* Results — show even while loading (stale-while-revalidate) */}
          {!error && articles.length > 0 && (
            <>
              {/* Stale-while-revalidate: subtle spinner when loading new page */}
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              )}
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="article-card bg-white rounded-[14px] overflow-hidden shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 group"
                  >
                    {/* Cover Image */}
                    <div className="h-48 bg-gradient-to-br from-[#ffeca1] to-white flex items-center justify-center relative overflow-hidden">
                      {article.cover_image ? (
                        <OptimizedImage
                          src={article.cover_image}
                          alt={article.title}
                          width={400}
                          height={192}
                          className="w-full h-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-[120deg] from-accent/12 to-transparent" />
                          <svg className="w-12 h-12 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-[22px] pb-6 flex flex-col flex-1">
                      {article.published_at && (
                        <span className="text-[12.5px] text-accent-dark font-bold mb-2 block">
                          {formatDate(article.published_at)}
                        </span>
                      )}
                      <h2 className="text-[17px] font-bold mb-2.5 line-clamp-2">{article.title}</h2>
                      {article.excerpt && (
                        <p className="text-[14px] text-gray mb-4 line-clamp-3">{article.excerpt}</p>
                      )}
                      <span className="text-[14px] font-bold text-dark inline-flex items-center gap-1.5 group/link mt-auto">
                        مطالعه بیشتر
                        <svg className="w-3.5 h-3.5 transition-transform group-hover/link:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
