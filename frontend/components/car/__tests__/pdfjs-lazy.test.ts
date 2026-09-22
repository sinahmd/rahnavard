/**
 * Structural pin for the lazy PDF.js engine loader (Phase 6).
 *
 * Importing the real `../pdfjs` module is safe — the pdfjs-dist import is
 * dynamic — but asserting against the real engine loader would require the
 * real package in jsdom. Instead this suite pins the *source-level*
 * contracts that keep the viewer off the critical path and the worker
 * same-origin:
 *
 * - `pdfjs-dist` is imported dynamically (never a top-level import);
 * - the worker URL is derived from the same package via
 *   `new URL(..., import.meta.url)` (webpack emits a hashed same-origin
 *   asset for it — no CSP change, per plan §8 Phase 6);
 * - the loader caches the engine promise (one load per session).
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const source = readFileSync(join(__dirname, '..', 'pdfjs.ts'), 'utf8')

describe('pdfjs engine loader — structural contract', () => {
  it('imports pdfjs-dist dynamically, never statically', () => {
    expect(source).toMatch(/import\('pdfjs-dist'\)/)
    expect(source).not.toMatch(/from 'pdfjs-dist'/)
    expect(source).not.toMatch(/require\('pdfjs-dist'\)/)
  })

  it('derives the worker URL from the package via import.meta.url', () => {
    expect(source).toMatch(/new URL\(\s*'pdfjs-dist\/build\/pdf\.worker\.min\.mjs',\s*import\.meta\.url\s*\)/)
  })

  it('caches the engine promise for a single load per session', () => {
    expect(source).toMatch(/let enginePromise/)
    expect(source).toMatch(/if \(!enginePromise\)/)
  })
})
