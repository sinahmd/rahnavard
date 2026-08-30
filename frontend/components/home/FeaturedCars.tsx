'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useSettings } from '@/contexts/SettingsContext'

interface Car {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  main_image: string
}

export default function FeaturedCars() {
  const sectionRef = useRef<HTMLElement>(null)
  const settings = useSettings()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try featured cars first, fall back to all active cars
        let res = await fetch('/api/v1/cars/?is_featured=true')
        let data = await res.json()
        let carsList = data.results || data || []

        if (carsList.length === 0) {
          res = await fetch('/api/v1/cars/')
          data = await res.json()
          carsList = data.results || data || []
        }

        setCars(carsList)
      } catch (error) {
        console.error('Error fetching cars:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )

    const elements = sectionRef.current?.querySelectorAll('.reveal-left, .reveal-scale')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [cars])

  return (
    <section id="cars" ref={sectionRef} className="bg-bg">
      <div className="wrap">
        <div className="section-head reveal-left">
          <span className="eyebrow">محصولات</span>
          <h2 className="section-title">{settings.cars_section_title}</h2>
          <p>{settings.cars_section_description}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray">در حال بارگذاری...</div>
        ) : cars.length === 0 ? (
          <div className="text-center py-12 text-gray">
            خودرویی یافت نشد. از پنل مدیریت خودرو اضافه کنید.
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <div
                key={car.id}
                className="car-card reveal-scale bg-white rounded-[14px] p-7 pb-6 shadow-card text-center flex flex-col items-center h-full transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
              >
                <div className="w-full aspect-[4/3] flex items-center justify-center mb-[18px] overflow-hidden">
                  {car.main_image ? (
                    <OptimizedImage
                      src={car.main_image}
                      alt={car.persian_name}
                      width={400}
                      height={300}
                      className="max-w-[88%] max-h-full object-contain transition-transform duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] hover:scale-110 hover:-translate-y-1.5"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-light flex items-center justify-center text-gray">
                      بدون تصویر
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-start w-full">
                  <span className="font-poppins text-[12.5px] tracking-[2px] text-gray font-semibold uppercase">
                    {car.brand}
                  </span>
                  <span className="font-poppins ltr text-[21px] font-bold tracking-[0.3px] my-1.5 mb-[22px]">
                    {car.model}
                  </span>
                </div>
                <Link href={`/cars/${car.slug}`} className="btn btn-dark w-full mt-auto">
                  مشاهده محصول
                </Link>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-12">
            <Link
              href="/cars"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-dark text-white rounded-xl font-bold text-[15px] transition-all duration-300 hover:bg-accent hover:shadow-lg hover:-translate-y-0.5"
            >
              مشاهده همه محصولات
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
          </div>
          </>
        )}
      </div>
    </section>
  )
}
