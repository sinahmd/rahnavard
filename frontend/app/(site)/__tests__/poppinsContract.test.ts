import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Phase 9 / UX-2 typography contract: `font-poppins` is Latin-script-only.
 * Persian-content elements must not carry it (the class's Poppins face has
 * no Persian glyphs; keeping the class is a latent regression hazard).
 *
 * These are source-level class assertions — the same style as
 * `pdfjs-lazy.test.ts` — pinning the exact files the plan scoped.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('font-poppins typography contract (Phase 9 / UX-2)', () => {
  it('removes font-poppins from the car-detail Persian h1 and price', () => {
    const src = read('app/(site)/cars/[slug]/page.tsx')
    const h1 = src.match(/<h1[^>]*>/)?.[0] ?? ''
    expect(h1).not.toContain('font-poppins')
    // The price paragraph inside the قیمت block.
    const priceP = src.match(/<p className="[^"]*text-2xl[^"]*">/)?.[0] ?? ''
    expect(priceP).not.toContain('font-poppins')
    expect(priceP).not.toBe('') // the matcher actually found the element
  })

  it('removes font-poppins from the CarCard Persian price span', () => {
    const src = read('components/car/CarCard.tsx')
    const priceSpan = src.match(/<span className="text-\[16px\][^"]*">/)?.[0] ?? ''
    expect(priceSpan).not.toContain('font-poppins')
    expect(priceSpan).not.toBe('')
  })

  it('keeps font-poppins on the Latin brand/model spans', () => {
    const card = read('components/car/CarCard.tsx')
    expect(card).toMatch(/font-poppins[^"]*"[^>]*>\s*\{car\.brand\}/)
    expect(card).toMatch(/font-poppins[^"]*"[^>]*>\s*\{car\.model\}/)
  })

  it('documents the Latin-only convention in lib/fonts.ts', () => {
    const fonts = read('lib/fonts.ts').replace(/\s+/g, ' ').replace(/\s*\*\s*/g, ' ')
    expect(fonts).toContain('TYPOGRAPHY CONTRACT')
    expect(fonts).toContain('LATIN-SCRIPT content only')
  })
})
