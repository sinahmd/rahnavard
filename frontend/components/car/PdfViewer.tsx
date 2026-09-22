'use client'

import { useEffect, useRef, useState } from 'react'
import type { PdfjsEngine, PdfjsPage } from './pdfjs'

interface Props {
  pdfUrl: string
  title?: string
}

/**
 * Rahnavard catalog PDF viewer (Phase 6, ADR-0010).
 *
 * Owns the viewer UI instead of delegating to each browser's native PDF
 * renderer: PDF.js renders pages to a canvas, and the controls (Persian
 * labels, project styling) are part of this component. The engine is
 * loaded lazily — only when this component is actually mounted behind the
 * catalog tab — and fully torn down on unmount (document destroyed, render
 * task cancelled). The PDF itself stays a plain `/media/` file; there is no
 * backend involvement.
 *
 * Cross-browser consistency is about the interaction model, not identical
 * layouts: the toolbar wraps on small screens and the page area scrolls.
 * "Open in new tab" (and download) deliberately hand the raw URL to the
 * browser's own viewer as an escape hatch.
 */

type ViewerStatus = 'loading' | 'ready' | 'error'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

export default function PdfViewer({ pdfUrl, title = 'کاتالوگ PDF' }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [status, setStatus] = useState<ViewerStatus>('loading')
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<PdfjsEngine | null>(null)
  const docRef = useRef<Awaited<ReturnType<PdfjsEngine['getDocument']>['promise']> | null>(null)
  const renderTaskRef = useRef<ReturnType<PdfjsPage['render']> | null>(null)

  // Render (or re-render) whenever the page, zoom, or document readiness
  // changes. The cleanup cancels any in-flight render, so a fast page/zoom
  // switch (or an unmount) always wins over the previous render — the
  // cancelled run surfaces as RenderingCancelledException, not an error.
  useEffect(() => {
    if (status !== 'ready') return
    let cancelled = false

    async function renderCurrentPage() {
      const doc = docRef.current
      const canvas = canvasRef.current
      if (!doc || !canvas) return

      try {
        const page = await doc.getPage(pageNumber)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas 2d context unavailable')

        // HiDPI: draw at device pixels, display at CSS pixels.
        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (error) {
        renderTaskRef.current = null
        // A cancelled render (page/zoom change or unmount) is not a failure.
        if (!cancelled && (error as { name?: string })?.name !== 'RenderingCancelledException') {
          setStatus('error')
        }
      }
    }

    void renderCurrentPage()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [status, pageNumber, scale])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        const cached = engineRef.current
        const engine = cached ?? (await import('./pdfjs').then((m) => m.loadPdfjs()))
        if (cancelled || !engine) return
        engineRef.current = engine

        // A stale document (url change / retry while one is open) is destroyed.
        const previousDoc = docRef.current
        docRef.current = null
        void previousDoc?.destroy()

        const task = engine.getDocument({ url: pdfUrl })
        const doc = await task.promise
        if (cancelled) {
          void task.destroy()
          return
        }

        docRef.current = doc
        setNumPages(doc.numPages)
        setPageNumber((current) => Math.min(Math.max(current, 1), doc.numPages))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [pdfUrl, reloadToken])

  // Full teardown: cancel rendering and destroy the loaded document.
  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
      void docRef.current?.destroy()
      docRef.current = null
    }
  }, [])

  const goToPage = (target: number) => {
    setPageNumber(Math.min(Math.max(target, 1), numPages))
  }

  const changeZoom = (delta: number) => {
    setScale((current) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((current + delta) * 100) / 100))
    )
  }

  const retry = () => {
    setReloadToken((token) => token + 1)
  }

  const zoomPercent = Math.round(scale * 100)
  const shellClass = fullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : ''
  const pageAreaClass = fullscreen
    ? 'flex-1 overflow-auto bg-gray-100 flex justify-center p-4'
    : 'overflow-auto bg-gray-100 rounded-b-xl flex justify-center p-4 max-h-[70vh]'

  return (
    <div className={shellClass}>
      {/* Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b ${
          fullscreen ? 'border-gray-200' : 'rounded-t-xl border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" />
            <path d="M8 14h8v1.5H8zM8 17h5v1.5H8z" />
          </svg>
          <span className="text-sm font-bold text-dark truncate">{title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Page navigation */}
          <div
            className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1"
            role="group"
            aria-label="ناوبری صفحه"
          >
            <button
              type="button"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={status !== 'ready' || pageNumber <= 1}
              className="w-7 h-7 flex items-center justify-center text-gray hover:text-dark hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="صفحه قبل"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-xs font-medium text-dark px-1" aria-live="polite">
              {status === 'ready' ? `صفحه ${pageNumber} از ${numPages}` : '—'}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={status !== 'ready' || pageNumber >= numPages}
              className="w-7 h-7 flex items-center justify-center text-gray hover:text-dark hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="صفحه بعد"
            >
              <svg className="w-4 h-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Zoom */}
          <div
            className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1"
            role="group"
            aria-label="کنترل‌های بزرگ‌نمایی"
          >
            <button
              type="button"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={status !== 'ready' || scale <= ZOOM_MIN}
              className="w-7 h-7 flex items-center justify-center text-gray hover:text-dark hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="کوچک‌نمایی"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="text-xs font-medium text-dark px-1 tabular-nums" aria-live="polite">
              {status === 'ready' ? `${zoomPercent}٪` : '—'}
            </span>
            <button
              type="button"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={status !== 'ready' || scale >= ZOOM_MAX}
              className="w-7 h-7 flex items-center justify-center text-gray hover:text-dark hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="بزرگ‌نمایی"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Escape hatch + download */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray hover:text-dark bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            مشاهده در تب جدید
          </a>
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

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setFullscreen((prev) => !prev)}
            aria-pressed={fullscreen}
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
        </div>
      </div>

      {/* Page area */}
      {status === 'loading' && (
        <div
          className={`${pageAreaClass} items-center`}
          role="status"
          aria-label="در حال بارگذاری کاتالوگ"
        >
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-gray">در حال بارگذاری کاتالوگ…</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={`${pageAreaClass} items-center`} role="alert">
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm text-gray">بارگذاری کاتالوگ ناموفق بود.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
              >
                تلاش مجدد
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-gray hover:text-dark bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                مشاهده در تب جدید
              </a>
            </div>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className={pageAreaClass}>
          <canvas ref={canvasRef} className="max-w-full h-auto shadow-sm" aria-label={title} role="img" />
        </div>
      )}

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
