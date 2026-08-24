import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JsonLd from '@/components/seo/JsonLd'

interface Car {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  description: string
  year: number
  fuel_type: string
  fuel_type_display: string
  transmission: string
  transmission_display: string
  engine: string
  price: string | null
  main_image: string
  gallery: string[]
  is_active: boolean
  is_featured: boolean
  seo_title: string
  seo_description: string
  og_image: string
  created_at: string
  updated_at: string
}

type Props = {
  params: { slug: string }
}

async function getCar(slug: string): Promise<Car | null> {
  try {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'
    const res = await fetch(`${backendUrl}/api/v1/cars/${slug}/`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await getCar(params.slug)

  if (!car) {
    return {
      title: 'خودرو یافت نشد | راهنورد خودرو',
    }
  }

  const title = car.seo_title || `${car.persian_name} | راهنورد خودرو`
  const description = car.seo_description || car.description || `${car.brand} ${car.model} - راهنورد خودرو`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: car.og_image
        ? [{ url: car.og_image, width: 800, height: 600, alt: car.persian_name }]
        : car.main_image
          ? [{ url: car.main_image, width: 800, height: 600, alt: car.persian_name }]
          : [],
    },
  }
}

export default async function CarDetailPage({ params }: Props) {
  const car = await getCar(params.slug)

  if (!car) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20">
          <div className="wrap text-center">
            <h1 className="text-3xl font-bold mb-4">خودرو یافت نشد</h1>
            <p className="text-gray mb-8">متأسفانه خودروی مورد نظر شما یافت نشد.</p>
            <Link href="/cars" className="btn btn-primary">
              بازگشت به لیست خودروها
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: car.persian_name,
          brand: {
            '@type': 'Brand',
            name: car.brand,
          },
          model: car.model,
          image: car.main_image ? `${siteUrl}${car.main_image}` : undefined,
          vehicleConfiguration: car.engine,
          fuelType: car.fuel_type_display,
          vehicleTransmission: car.transmission_display,
          modelDate: car.year.toString(),
        }}
      />
      <Header />
      <main className="pt-32 pb-20">
        <div className="wrap">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-gray">
              <li>
                <Link href="/" className="hover:text-accent-dark transition-colors">
                  خانه
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/cars" className="hover:text-accent-dark transition-colors">
                  خودروها
                </Link>
              </li>
              <li>/</li>
              <li className="text-dark font-medium">{car.persian_name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Car Image */}
            <div className="bg-white rounded-[14px] p-8 shadow-card flex items-center justify-center aspect-[4/3]">
              {car.main_image ? (
                <Image
                  src={car.main_image}
                  alt={car.persian_name}
                  width={600}
                  height={450}
                  className="max-w-full max-h-full object-contain"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>تصویری آپلود نشده</p>
                  </div>
                </div>
              )}
            </div>

            {/* Car Info */}
            <div>
              <span className="font-poppins text-sm tracking-[2px] text-gray font-semibold uppercase">
                {car.brand}
              </span>
              <h1 className="font-poppins text-3xl md:text-4xl font-bold mt-2 mb-6">
                {car.model}
              </h1>
              {car.description && (
                <p className="text-gray text-lg leading-relaxed mb-8">
                  {car.description}
                </p>
              )}

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">سال ساخت</span>
                  <span className="font-bold">{car.year}</span>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">نوع سوخت</span>
                  <span className="font-bold">{car.fuel_type_display}</span>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">گیربکس</span>
                  <span className="font-bold">{car.transmission_display}</span>
                </div>
                {car.engine && (
                  <div className="bg-bg rounded-xl p-4">
                    <span className="text-sm text-gray block mb-1">موتور</span>
                    <span className="font-bold">{car.engine}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="flex gap-4">
                <a href="#consult" className="btn btn-primary flex-1">
                  درخواست مشاوره
                </a>
                <a href="#consult" className="btn btn-dark flex-1">
                  تماس با ما
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
