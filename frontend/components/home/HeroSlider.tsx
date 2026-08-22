'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface HeroSlide {
  id: number
  title: string
  image: string
  alt_text: string
}

const SLIDE_DURATION = 6000

export default function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [isZooming, setIsZooming] = useState(true)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hero-slides/`)
        if (response.ok) {
          const data = await response.json()
          setSlides(data.results || data || [])
        }
      } catch (error) {
        console.error('Error fetching hero slides:', error)
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
    setTimeout(() => setIsZooming(true), 50)
  }, [slides.length])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(next, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [next, slides.length])

  if (loading) {
    return <div className="relative w-full max-h-screen aspect-[1540/860] bg-[#111]" />
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full max-h-screen aspect-[1540/860] bg-[#111] flex items-center justify-center">
        <p className="text-white/50 text-lg">اسلایدی یافت نشد. از پنل مدیریت اسلاید اضافه کنید.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-h-screen aspect-[1540/860] overflow-hidden bg-[#111]">
      {slides.map((slide, index) => (
        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}>
          <Image
            src={slide.image}
            alt={slide.alt_text}
            fill
            className={`object-cover object-center ${index === current && isZooming ? 'animate-hero-zoom' : 'scale-[1.037]'}`}
            priority={index === 0}
            sizes="100vw"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15 pointer-events-none" />

      <div className="absolute top-1/2 right-6 left-6 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
        <button onClick={prev} className="pointer-events-auto w-[46px] h-[46px] rounded-full bg-white/16 border border-white/40 text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/30 backdrop-blur-sm" aria-label="اسلاید قبلی">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <button onClick={next} className="pointer-events-auto w-[46px] h-[46px] rounded-full bg-white/16 border border-white/40 text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/30 backdrop-blur-sm" aria-label="اسلاید بعدی">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>

      <div className="absolute bottom-16 right-0 left-0 z-10">
        <div className="wrap flex items-end justify-between gap-5">
          <div className="flex gap-3.5 flex-wrap">
            <a href="#cars" className="btn btn-primary">مشاهده خودروها</a>
            <a href="#consult" className="btn btn-outline">درخواست مشاوره</a>
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
