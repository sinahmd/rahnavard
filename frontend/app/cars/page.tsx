import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'خودروها | راهنورد خودرو',
  description: 'مجموعه‌ای از خودروهای وارداتی راهنورد خودرو شامل هیوندای، کیا و تویوتا با گارانتی رسمی.',
}

async function getCars() {
  try {
    const res = await fetch('/api/v1/cars/', {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || data || []
  } catch {
    return []
  }
}

export default async function CarsPage() {
  const cars = await getCars()

  return (
    <>
      <Header />
      <main className="pt-32 pb-20">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">محصولات</span>
            <h1 className="section-title">خودروهای ما</h1>
            <p>مجموعه‌ای از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی رسمی.</p>
          </div>

          {cars.length === 0 ? (
            <div className="text-center py-12 text-gray">
              خودرویی یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car: any) => (
                <Link
                  key={car.id}
                  href={`/cars/${car.slug}`}
                  className="car-card bg-white rounded-[14px] p-7 pb-6 shadow-card text-center flex flex-col items-center h-full transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
                >
                  <div className="w-full aspect-[4/3] flex items-center justify-center mb-[18px] overflow-hidden">
                    {car.main_image ? (
                      <Image
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
                  <div className="flex-1 flex flex-col items-center justify-start w-full">
                    <span className="font-poppins text-[12.5px] tracking-[2px] text-gray font-semibold uppercase">
                      {car.brand}
                    </span>
                    <span className="font-poppins ltr text-[21px] font-bold tracking-[0.3px] my-1.5 mb-[22px]">
                      {car.model}
                    </span>
                  </div>
                  <span className="btn btn-dark w-full mt-auto">مشاهده محصول</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
