'use client'

import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import type { CarListItem } from '@/types/car'

function formatPrice(price: string | null): string | null {
  if (!price) return null
  const num = parseInt(price, 10)
  if (isNaN(num)) return null
  return new Intl.NumberFormat('fa-IR').format(num)
}

export default function CarCard({ car }: { car: CarListItem }) {
  const price = formatPrice(car.price)

  return (
    <Link
      href={`/cars/${car.slug}`}
      className="car-card bg-white rounded-[14px] shadow-card text-center flex flex-col items-center h-full transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 overflow-hidden group"
    >
      {/* Image */}
      <div className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden bg-white p-4">
        {car.main_image ? (
          <OptimizedImage
            src={car.main_image}
            alt={car.persian_name}
            width={400}
            height={300}
            className="max-w-[88%] max-h-full object-contain transition-transform duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-light flex items-center justify-center text-gray text-sm">
            بدون تصویر
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full px-5 pb-5 flex flex-col flex-1">
        {/* Featured badge */}
        {car.is_featured && (
          <span className="inline-block self-center px-2.5 py-0.5 bg-accent/20 text-accent-dark text-[11px] font-bold rounded-full mb-2">
            ویژه
          </span>
        )}

        {/* Brand & Model */}
        <span className="font-poppins text-[12px] tracking-[2px] text-gray font-semibold uppercase">
          {car.brand}
        </span>
        <span className="font-poppins ltr text-[20px] font-bold tracking-[0.3px] my-1">
          {car.model}
        </span>
        <span className="text-[13px] text-gray mb-3">{car.persian_name}</span>

        {/* Specs row */}
        <div className="flex items-center justify-center gap-2 text-[12px] text-gray mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {car.year}
          </span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>{car.fuel_type_display}</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>{car.transmission_display}</span>
          {car.body_type && (
            <>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{car.body_type}</span>
            </>
          )}
        </div>

        {/* Price */}
        {price && (
          <div className="mb-3">
            <span className="text-[16px] font-extrabold text-dark font-poppins">
              {price}
            </span>
            <span className="text-[12px] font-normal text-gray mr-1">تومان</span>
          </div>
        )}

        {/* CTA */}
        <span className="btn btn-dark w-full mt-auto text-[14px] py-3">
          مشاهده محصول
        </span>
      </div>
    </Link>
  )
}
