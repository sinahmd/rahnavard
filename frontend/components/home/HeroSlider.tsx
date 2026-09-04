'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import type { HeroSlide } from '@/types/heroSlide'

/** Slides always carry an image once loaded (rows without one are dropped). */
type LoadedSlide = HeroSlide & { image: string }

const SLIDE_DURATION = 6000
const SWIPE_THRESHOLD = 50
const SWIPE_MAX_DRAG = 120

export default function HeroSlider() {
  const [slides, setSlides] = useState<LoadedSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [isZooming, setIsZooming] = useState(true)

  // ── Touch / swipe state ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchDeltaX = useRef(0)
  const isSwiping = useRef(false)
  const isVerticalScroll = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch('/api/v1/hero-slides/')
        if (response.ok) {
          const data = await response.json()
          const loaded = (data.results || data || []).filter(
            (slide: HeroSlide): slide is LoadedSlide => Boolean(slide.image)
          )
          setSlides(loaded)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchSlides()
  }, [])

  const goTo = useCallback((index: number) => {
    if (slides.length === 0) return
    setCurrent(((index % slides.length) + slides.length) % slides.length)
    setIsZooming(false)
    setDragOffset(0)
    setTimeout(() => setIsZooming(true), 50)
  }, [slides.length])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Auto-play
  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(next, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [next, slides.length])

  // ── Touch handlers ──────────────────────────────────────────────────
  // touchmove must be a native listener with { passive: false }
  // so preventDefault() works on Android Chrome.
  // React's onTouchMove is passive by default and ignores preventDefault.
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchDeltaX.current = 0
    isSwiping.current = false
    isVerticalScroll.current = false
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX.current
      const deltaY = e.touches[0].clientY - touchStartY.current

      // Determine scroll direction on first significant movement
      if (!isSwiping.current && !isVerticalScroll.current) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            isVerticalScroll.current = true
            return
          }
          isSwiping.current = true
        }
        return
      }

      if (isVerticalScroll.current) return

      // Prevent vertical scroll while swiping horizontally
      e.preventDefault()

      // Clamp the drag with rubber-band resistance at edges
      let clampedDelta = deltaX
      if (current === 0 && deltaX > 0) {
        clampedDelta = deltaX * 0.3
      } else if (current === slides.length - 1 && deltaX < 0) {
        clampedDelta = deltaX * 0.3
      }
      clampedDelta = Math.max(-SWIPE_MAX_DRAG, Math.min(SWIPE_MAX_DRAG, clampedDelta))

      touchDeltaX.current = clampedDelta
      setDragOffset(clampedDelta)
    },
    [current, slides.length]
  )

  // Register touchmove as a non-passive native listener so
  // preventDefault() actually works on Android Chrome.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [handleTouchMove])

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) {
      setDragOffset(0)
      return
    }

    const delta = touchDeltaX.current

    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      // In RTL: swiping right (positive delta) = go to NEXT slide
      //         swiping left (negative delta) = go to PREV slide
      if (delta > 0) {
        next()
      } else {
        prev()
      }
    } else {
      // Snap back
      setDragOffset(0)
    }

    isSwiping.current = false
    touchDeltaX.current = 0
  }, [next, prev])

  if (loading) {
    return <div className="relative w-full max-h-[100dvh] aspect-[4/5] md:aspect-[1540/860] bg-[#111]" />
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full max-h-[100dvh] aspect-[4/5] md:aspect-[1540/860] bg-[#111] flex items-center justify-center">
        <p className="text-white/50 text-lg">اسلایدی یافت نشد. از پنل مدیریت اسلاید اضافه کنید.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[100dvh] aspect-[4/5] md:aspect-[1540/860] overflow-hidden bg-[#111] touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
            index === current ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={
            index === current && dragOffset !== 0
              ? { transform: `translateX(${dragOffset}px)`, transition: 'opacity 900ms ease-in-out, transform 0ms' }
              : undefined
          }
        >
          {slide.link && slide.link.trim() !== '' ? (
            <Link href={slide.link} className="block absolute inset-0">
              <OptimizedImage
                src={slide.image}
                alt={slide.alt_text}
                fill
                className={`object-cover object-center ${
                  index === current && isZooming ? 'animate-hero-zoom' : 'scale-[1.037]'
                }`}
                priority={index === 0}
                sizes="100vw"
              />
            </Link>
          ) : (
            <OptimizedImage
              src={slide.image}
              alt={slide.alt_text}
              fill
              className={`object-cover object-center ${
                index === current && isZooming ? 'animate-hero-zoom' : 'scale-[1.037]'
              }`}
              priority={index === 0}
              sizes="100vw"
            />
          )}
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15 pointer-events-none" />

      <div className="absolute top-1/2 right-4 md:right-6 left-4 md:left-6 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
        <button onClick={prev} className="pointer-events-auto w-[38px] h-[38px] md:w-[46px] md:h-[46px] rounded-full bg-white/16 border border-white/40 text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/30 backdrop-blur-sm" aria-label="اسلاید قبلی">
          <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <button onClick={next} className="pointer-events-auto w-[38px] h-[38px] md:w-[46px] md:h-[46px] rounded-full bg-white/16 border border-white/40 text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/30 backdrop-blur-sm" aria-label="اسلاید بعدی">
          <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>

      <div className="absolute bottom-16 right-0 left-0 z-10 hidden md:block">
        <div className="wrap flex items-end justify-between gap-5">
          <div className="flex gap-3.5 flex-wrap">
            <Link href="/cars" className="btn btn-primary">مشاهده خودروها</Link>
            <a href="/#consult" className="btn btn-outline">درخواست مشاوره</a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-0 left-0 flex justify-center gap-[15px] z-10">
        {slides.map((_, index) => (
          <button key={index} onClick={() => goTo(index)} className={`rounded-full cursor-pointer transition-all ${index === current ? 'w-[26px] h-[9px] bg-accent rounded-[5px]' : 'w-[9px] h-[9px] bg-white/[0.048]'}`} aria-label={`اسلاید ${index + 1}`} />
        ))}
      </div>
    </div>
  )
}
