'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CarCardImage from '@/components/car/CarCardImage'
import SectionHead from '@/components/site/SectionHead'
import type { CarListItem } from '@/types/car'


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
  const [cars, setCars] = useState<CarListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/cars/?is_active=true&limit=20')
        if (!res.ok) throw new Error('Failed to fetch related cars')
        const data = await res.json()
        const all: CarListItem[] = data.results || data || []
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
      <SectionHead eyebrow="پیشنهاد ما" title="خودروهای مرتبط" />
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-6 min-w-max">
          {cars.map((car) => (
            <Link
              key={car.id}
              href={`/cars/${car.slug}`}
              className="car-card bg-white rounded-[14px] p-6 shadow-card text-center flex flex-col items-center w-[280px] shrink-0 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
            >
              <CarCardImage
                src={car.main_image}
                alt={car.persian_name}
                className="mb-4"
                placeholderClassName="text-sm"
              />
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
