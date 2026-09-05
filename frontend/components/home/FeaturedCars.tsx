'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import CarCardImage from '@/components/car/CarCardImage'
import SectionHead from '@/components/site/SectionHead'
import type { CarListItem } from '@/types/car'
import type { SiteSettings } from '@/types/settings'

export default function FeaturedCars({
  cars,
  settings,
}: {
  cars: CarListItem[]
  settings: SiteSettings
}) {
  const sectionRef = useRef<HTMLElement>(null)

  // Scroll-reveal is progressive enhancement only — the car cards are
  // already in the server-rendered HTML.
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
        <SectionHead
          eyebrow="محصولات"
          title={settings.cars_section_title}
          description={settings.cars_section_description}
          reveal="left"
        />

        {cars.length === 0 ? (
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
                <CarCardImage
                  src={car.main_image}
                  alt={car.persian_name}
                  className="mb-[18px]"
                  imageClassName="transition-transform duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] hover:scale-110 hover:-translate-y-1.5"
                />
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
