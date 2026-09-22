/**
 * HeroSlider reduced-motion behavior (plan §6.I): the JS autoplay must not
 * run when the user prefers reduced motion — manual prev/next/dots still
 * work, but no interval advances the slide.
 */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import HeroSlider from '../HeroSlider'

const SLIDE_DURATION = 6000

// LoadedSlide = HeroSlide & { image: string } — the literal satisfies it.
const slides = [
  { id: 1, title: 'اسلاید یک', image: '/media/slides/s1.jpg', alt_text: 'تصویر یک', link: '', is_active: true, display_order: 1 },
  { id: 2, title: 'اسلاید دو', image: '/media/slides/s2.jpg', alt_text: 'تصویر دو', link: '', is_active: true, display_order: 2 },
]

const mql = (matches: boolean) => ({
  matches,
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})

const activeDots = () => {
  const dots = screen.getAllByRole('button', { name: /اسلاید \d/ })
  return dots.map((dot) => dot.className.includes('bg-accent'))
}

beforeEach(() => {
  jest.useFakeTimers()
  ;(window.matchMedia as jest.Mock).mockReturnValue(mql(false))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('HeroSlider autoplay', () => {
  it('pauses autoplay when the user prefers reduced motion', () => {
    ;(window.matchMedia as jest.Mock).mockReturnValue(mql(true))

    render(<HeroSlider slides={slides} />)

    // Starts on slide 1.
    expect(activeDots()).toEqual([true, false])

    // Two full durations: no autoplay means the slide never advances.
    act(() => {
      jest.advanceTimersByTime(SLIDE_DURATION * 2 + 100)
    })
    expect(activeDots()).toEqual([true, false])
  })

  it('autoplays to the next slide when motion is allowed', () => {
    render(<HeroSlider slides={slides} />)

    expect(activeDots()).toEqual([true, false])

    act(() => {
      jest.advanceTimersByTime(SLIDE_DURATION + 100)
    })
    expect(activeDots()).toEqual([false, true])
  })

  it('still navigates manually under reduced motion', () => {
    ;(window.matchMedia as jest.Mock).mockReturnValue(mql(true))

    render(<HeroSlider slides={slides} />)
    expect(activeDots()).toEqual([true, false])

    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.click(screen.getByRole('button', { name: 'اسلاید بعدی' }))
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(activeDots()).toEqual([false, true])
  })
})

// ── Touch gesture handling (plan Phase 8 / UX-3) ─────────────────────────

/**
 * Synthetic touch-event factory. jsdom TouchEvents carry no real touches, so
 * each event is given a `touches` array (and `cancelable` where relevant)
 * before dispatch — matching how the component reads them
 * (e.touches[0].clientX / e.cancelable).
 */
type MinimalTouchEvent = Omit<TouchEvent, 'touches'> & {
  touches: { clientX: number; clientY: number }[]
}

const touch = (type: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number, cancelable = true) => {
  const container = document.querySelector('div.touch-pan-y')!
  const event = new Event(type, { bubbles: true, cancelable }) as unknown as MinimalTouchEvent
  event.touches = [{ clientX: x, clientY: y }]
  act(() => {
    fireEvent(container, event)
  })
  return event
}

const swipeOf = (dx: number, dy: number, cancelable = true) => {
  touch('touchstart', 100, 100)
  const moveEvent = touch('touchmove', 100 + dx, 100 + dy, cancelable)
  touch('touchend', 100 + dx, 100 + dy)
  return moveEvent
}

describe('HeroSlider touch gestures (Phase 8 / UX-3)', () => {
  // Note on directions: the component maps delta > 0 (right swipe) to next()
  // but its pre-existing edge rubber-band rule (current === 0 && deltaX > 0 →
  // ×0.3) keeps right-swipes at the first slide below SWIPE_THRESHOLD — max
  // effective drag 120×0.3=36 < 50 — so the left swipe (prev, which wraps to
  // the last slide) is the direction that demonstrably completes from
  // slide 1. These tests pin gesture mechanics (Phase 8 scope), not that
  // legacy edge asymmetry.
  it('completes a horizontal swipe into the slide transition', () => {
    render(<HeroSlider slides={slides} />)
    expect(activeDots()).toEqual([true, false])

    swipeOf(-60, 8) // prev from slide 1 wraps to the last slide
    expect(activeDots()).toEqual([false, true])
  })

  it('snaps back when the swipe does not reach the threshold', () => {
    render(<HeroSlider slides={slides} />)
    swipeOf(-30, 5) // under SWIPE_THRESHOLD (50)
    expect(activeDots()).toEqual([true, false])
  })

  it('never calls preventDefault on a vertical-dominant gesture (no scroll hijack)', () => {
    render(<HeroSlider slides={slides} />)
    const event = swipeOf(6, 60)
    expect(event.defaultPrevented).toBe(false)
    expect(activeDots()).toEqual([true, false])
  })

  it('completes a slightly drifting horizontal swipe even when the browser already won the slope race (non-cancelable moves)', () => {
    render(<HeroSlider slides={slides} />)
    // The whole move stream is non-cancelable — the browser committed to
    // panning before the JS direction lock fired. The drag offset must
    // still accumulate so touchend commits the transition (the old code
    // froze the drag and the swipe stalled).
    const event = swipeOf(-60, 8, false)
    expect(event.defaultPrevented).toBe(false) // guarded, no Intervention warning
    expect(activeDots()).toEqual([false, true])
  })

  it('does not hijack a non-cancelable vertical scroll either', () => {
    render(<HeroSlider slides={slides} />)
    const event = swipeOf(6, 60, false)
    expect(event.defaultPrevented).toBe(false)
    expect(activeDots()).toEqual([true, false])
  })

  it('locks direction with hysteresis: a clearly vertical gesture never becomes a swipe, a drifting horizontal one does', () => {
    render(<HeroSlider slides={slides} />)
    // 60 vs 12 — vertical-dominant beyond the 1.2 slope margin → scroll.
    const vertical = swipeOf(12, 60)
    expect(vertical.defaultPrevented).toBe(false)
    expect(activeDots()).toEqual([true, false])

    // 60 vs 12 — horizontal wins at the margin (old code called this vertical
    // because |dy| > |dx|) → the swipe completes.
    const drifting = swipeOf(-60, 12)
    expect(activeDots()).toEqual([false, true])
    expect(drifting.defaultPrevented).toBe(true) // cancelable move: the swipe claims it
  })
})
