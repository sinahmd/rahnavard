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