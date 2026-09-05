/**
 * Reduced-motion CSS contract (plan §6.I / gate §10 Phase 5): the
 * `prefers-reduced-motion` block in globals.css must disable smooth
 * scrolling, reveal transforms, keyframe animations (modals/hero zoom), and
 * blanket transitions. Static presence test — the browser enforces the
 * actual behavior; jsdom has no layout engine.
 */
import fs from 'fs'
import path from 'path'

describe('reduced-motion CSS', () => {
  const css = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8')

  const motionBlock = () => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(start).toBeGreaterThan(-1)
    // The block ends at the next top-level closing brace pair; slicing to
    // the end of the file is fine — the block is the last media query.
    return css.slice(start)
  }

  it('declares a prefers-reduced-motion media query', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('disables smooth scrolling and reveal transitions inside the block', () => {
    const block = motionBlock()
    expect(block).toContain('scroll-behavior: auto')
    expect(block).toMatch(/\.reveal[^{]*\{[^}]*opacity: 1 !important/)
    expect(block).toMatch(/transition: none !important/)
  })

  it('kills modal/keyframe animations and all remaining transitions', () => {
    const block = motionBlock()
    expect(block).toContain('.animate-slide-up')
    expect(block).toContain('.animate-hero-zoom')
    expect(block).toContain('animation: none !important')
    expect(block).toContain('transition-duration: 0.01ms !important')
    expect(block).toContain('animation-duration: 0.01ms !important')
  })
})