'use client'

interface Props {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null

  // Build page numbers to display
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    // Always show first page
    pages.push(1)

    if (currentPage > 3) {
      pages.push('...')
    }

    // Show pages around current
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('...')
    }

    // Always show last page
    pages.push(totalPages)

    return pages
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageChange = (page: number) => {
    onPageChange(page)
    scrollToTop()
  }

  return (
    <nav className="flex items-center justify-center gap-2 mt-10" aria-label="صفحه‌بندی">
      {/* Previous */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="w-10 h-10 rounded-lg border border-gray-light bg-white flex items-center justify-center text-dark transition-colors hover:border-accent hover:text-accent-dark disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-light disabled:hover:text-dark"
        aria-label="صفحه قبلی"
      >
        <svg className="w-4 h-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((page, idx) => {
        if (page === '...') {
          return (
            <span key={`dots-${idx}`} className="w-10 h-10 flex items-center justify-center text-gray text-sm">
              ...
            </span>
          )
        }
        const isActive = page === currentPage
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold transition-all ${
              isActive
                ? 'bg-accent text-dark shadow-sm'
                : 'bg-white border border-gray-light text-dark hover:border-accent hover:text-accent-dark'
            }`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`صفحه ${page}`}
          >
            {page}
          </button>
        )
      })}

      {/* Next */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="w-10 h-10 rounded-lg border border-gray-light bg-white flex items-center justify-center text-dark transition-colors hover:border-accent hover:text-accent-dark disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-light disabled:hover:text-dark"
        aria-label="صفحه بعدی"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </nav>
  )
}
