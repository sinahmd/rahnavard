/**
 * Lazy PDF.js engine loader (Phase 6, ADR-0010).
 *
 * `pdfjs-dist` (~300 KB gzipped) must never sit on the car-detail critical
 * path — the only consumer is the catalog `PdfViewer`, which imports this
 * module dynamically when the viewer is actually shown. The engine is
 * loaded once per session and reused across viewer mounts.
 *
 * Build choice: the package root resolves to the modern, non-transpiled
 * build (`build/pdf.mjs`), which per the official support table targets
 * current Chrome/Edge/Firefox and Safari 18+ — matching the plan's "modern
 * browsers" requirement. If an older Safari ever becomes a real support
 * target, switching to `pdfjs-dist/legacy/build/pdf.mjs` (and its worker)
 * is the whole change.
 *
 * Worker: webpack resolves the `new URL(..., import.meta.url)` expression to
 * the hashed `pdf.worker.min.mjs` asset emitted next to the bundle, so the
 * worker is same-origin (`/…/pdf.worker.min.mjs`) and needs no CSP change
 * (`script-src 'self'` covers it). API and worker ship from the same
 * package version — the version-match requirement from the PDF.js FAQ
 * holds by construction.
 */

export interface PdfjsEngine {
  getDocument: (src: { url: string }) => {
    promise: Promise<{
      numPages: number
      getPage: (pageNumber: number) => Promise<PdfjsPage>
      destroy: () => Promise<void>
    }>
    destroy: () => Promise<void>
  }
  GlobalWorkerOptions: { workerSrc: string }
}

export interface PdfjsPage {
  getViewport: (options: { scale: number }) => {
    width: number
    height: number
  }
  render: (options: {
    canvas: HTMLCanvasElement
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
    transform?: number[]
  }) => {
    promise: Promise<void>
    cancel: () => void
  }
}

type PdfjsModule = PdfjsEngine

let enginePromise: Promise<PdfjsModule> | null = null

/** Load (once) and return the shared PDF.js engine. */
export function loadPdfjs(): Promise<PdfjsModule> {
  if (!enginePromise) {
    enginePromise = import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
        // The package's structural types are far wider than the small surface
        // this viewer uses; the narrow interface is the component contract.
        return pdfjs as unknown as PdfjsModule
      })
      .catch((error) => {
        // A failed import must not poison the cache: clear it so the next
        // loadPdfjs() call performs a fresh import() attempt and a transient
        // chunk-load failure can recover without a page reload.
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

/**
 * Test-only reset so each test file starts with a fresh engine loader.
 */
export function resetPdfjsLoader(): void {
  enginePromise = null
}
