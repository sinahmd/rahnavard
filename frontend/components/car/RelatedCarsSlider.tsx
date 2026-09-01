'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'


interface Car {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  main_image: string
}

interface Props {
  currentSlug: string
}

/**
 * Fetches the list of active cars and renders up to six related cars
 * (excluding the currently viewed one) in a horizontal scroll list.
 *
 * This is a client component so we can use useEffect / useState to fetch
 * data after hydration. The API call goes through the public
 * `/api/v1/cars/` endpoint and reuses the same shape as the rest of
 * the frontend.
 */
export default function RelatedCarsSlider({ currentSlug }: Props) {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/cars/?is_active=true&limit=20')
        if (!res.ok) throw new Error('Failed to fetch related cars')
        const data = await res.json()
        const all: Car[] = data.results || data || []
        const filtered = all.filter((c) => c.slug !== currentSlug).slice(0, 6)
        setCars(filtered)
      } catch {
        // Silently fail: the slider is a non‑critical enhancement.
        // The page remains fully functional without related cars.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentSlug])

  if (loading) {
    return (
      <div className="text-center py-8 text-gray">در حال بارگذاری خودروهای مرتبط...</div>
    )
  }

  if (cars.length === 0) {
    return null
  }

  return (
    <section>
      <div className="section-head">
        <span className="eyebrow">پیشنهاد ما</span>
        <h2 className="section-title">خودروهای مرتبط</h2>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-6 min-w-max">
          {cars.map((car) => (
            <Link
              key={car.id}
              href={`/cars/${car.slug}`}
              className="car-card bg-white rounded-[14px] p-6 shadow-card text-center flex flex-col items-center w-[280px] shrink-0 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
            >
              <div className="w-full aspect-[4/3] flex items-center justify-center mb-4 overflow-hidden">
                {car.main_image ? (
                  <OptimizedImage
                    src={car.main_image}
                    alt={car.persian_name}
                    width={400}
                    height={300}
                    className="max-w-[88%] max-h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-light flex items-center justify-center text-gray text-sm">
                    بدون تصویر
                  </div>
                )}
              </div>
              <span className="font-poppins text-[12.5px] tracking-[2px] text-gray font-semibold uppercase">
                {car.brand}
              </span>
              <span className="font-poppins ltr text-[18px] font-bold tracking-[0.3px] my-1.5 mb-4">
                {car.model}
              </span>
              <span className="btn btn-dark w-full mt-auto text-sm">مشاهده محصول</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
