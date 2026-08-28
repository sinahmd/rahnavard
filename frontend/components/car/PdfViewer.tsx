'use client'

import { useState } from 'react'

interface Props {
  pdfUrl: string
  title?: string
}

/**
 * PDF viewer with download button and full-screen toggle.
 * Uses an iframe for rendering — lightweight and no extra dependencies.
 */
export default function PdfViewer({ pdfUrl, title = 'کاتالوگ PDF' }: Props) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : ''}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-b ${fullscreen ? 'border-gray-200' : 'rounded-t-xl border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" />
            <path d="M8 14h8v1.5H8zM8 17h5v1.5H8z" />
          </svg>
          <span className="text-sm font-bold text-dark">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullscreen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray hover:text-dark bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {fullscreen ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                </svg>
                خروج از تمام‌صفحه
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                </svg>
                تمام‌صفحه
              </>
            )}
          </button>
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3" />
            </svg>
            دانلود
          </a>
        </div>
      </div>

      {/* PDF iframe */}
      <iframe
        src={pdfUrl}
        title={title}
        className={`w-full border-0 ${fullscreen ? 'flex-1' : 'h-[600px] rounded-b-xl'}`}
      />

      {/* Fullscreen close overlay */}
      {fullscreen && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="absolute top-3 left-14 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-dark transition-colors z-10"
          aria-label="بستن تمام‌صفحه"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
