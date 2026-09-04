'use client'

import { useEffect } from 'react'

/**
 * Public (site) route-group error boundary. Client error ↔ server retry:
 * `reset` re-renders the segment; a failed RSC fetch in lib/data resolves
 * to null rather than throwing, so this boundary mostly catches genuine
 * render errors — the site chrome (Header/Footer) stays intact because the
 * layout lives above this boundary.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for diagnostics; the public page shows a friendly message.
    console.error(error)
  }, [error])

  return (
    <main className="pt-32 pb-20">
      <div className="wrap text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-light rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4">خطایی رخ داد</h1>
        <p className="text-gray mb-8 text-lg">
          متأسفانه در نمایش این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
        </p>
        <button onClick={reset} className="btn btn-primary">
          تلاش مجدد
        </button>
      </div>
    </main>
  )
}