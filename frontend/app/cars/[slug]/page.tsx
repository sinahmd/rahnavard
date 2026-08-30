import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JsonLd from '@/components/seo/JsonLd'
import Tabs from '@/components/ui/Tabs'
import RelatedCarsSlider from '@/components/car/RelatedCarsSlider'
import CarImageGallery from '@/components/car/CarImageGallery'
import PdfViewer from '@/components/car/PdfViewer'
import CarCTAButtons from '@/components/car/CarCTAButtons'

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
  manufacturer: string
  body_type: string
  color: string
  technical_description: string
  catalog_file: string | null
}

type Props = {
  params: { slug: string }
}

async function getCar(slug: string): Promise<Car | null> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/cars/${slug}/`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const data = await res.json()
      // Strip internal backend URL prefix — backend returns http://backend:8000/media/...
      // but client components need relative /media/... URLs for OptimizedImage to work
      const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'
      if (data.main_image && data.main_image.startsWith(backendUrl)) {
        data.main_image = data.main_image.slice(backendUrl.length)
      }
      if (data.catalog_file && data.catalog_file.startsWith(backendUrl)) {
        data.catalog_file = data.catalog_file.slice(backendUrl.length)
      }
      if (data.og_image && data.og_image.startsWith(backendUrl)) {
        data.og_image = data.og_image.slice(backendUrl.length)
      }
      return data
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return null
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: car.og_image
        ? [{ url: car.og_image.startsWith('http') ? car.og_image : `${siteUrl}${car.og_image}`, width: 800, height: 600, alt: car.persian_name }]
        : car.main_image
          ? [{ url: car.main_image.startsWith('http') ? car.main_image : `${siteUrl}${car.main_image}`, width: 800, height: 600, alt: car.persian_name }]
          : [],
    },
  }
}

/** Spec icon for visual indicators in the specs grid. */
function SpecIcon({ type }: { type: 'year' | 'fuel' | 'transmission' | 'engine' | 'color' | 'body' | 'country' | 'brand' }) {
  const icons: Record<string, JSX.Element> = {
    year: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    fuel: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    transmission: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    engine: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
      </svg>
    ),
    body: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21a.75.75 0 00.75-.75V11.25a3 3 0 00-3-3h-1.5l-1.72-4.575A1.125 1.125 0 0014.12 3H9.88a1.125 1.125 0 00-1.06.775L7.1 8.25H5.625a3 3 0 00-3 3v5.25c0 .621.504 1.125 1.125 1.125h14.25" />
      </svg>
    ),
    country: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    brand: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  }
  return icons[type] || null
}

/** Spec item with icon, label, and value. */
function SpecItem({
  icon,
  label,
  value,
}: {
  icon: 'year' | 'fuel' | 'transmission' | 'engine' | 'color' | 'body' | 'country' | 'brand'
  label: string
  value: string | null | undefined
}) {
  if (!value || value === '—') return null

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-accent/10 transition-colors group">
      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-accent-dark group-hover:bg-accent group-hover:text-dark transition-colors shrink-0">
        <SpecIcon type={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray font-medium">{label}</p>
        <p className="text-sm font-bold text-dark truncate">{value}</p>
      </div>
    </div>
  )
}

export default async function CarDetailPage({ params }: Props) {
  const car = await getCar(params.slug)

  if (!car) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20">
          <div className="wrap text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-light rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">خودرو یافت نشد</h1>
            <p className="text-gray mb-8 text-lg">متأسفانه خودروی مورد نظر شما یافت نشد.</p>
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
  const hasSpecs = car.manufacturer || car.body_type || car.color || car.engine || car.fuel_type_display || car.transmission_display || car.year

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
      <main className="pt-28 pb-20">
        <div className="wrap">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-gray">
              <li>
                <Link href="/" className="hover:text-accent-dark transition-colors">خانه</Link>
              </li>
              <li className="text-gray-300">/</li>
              <li>
                <Link href="/cars" className="hover:text-accent-dark transition-colors">خودروها</Link>
              </li>
              <li className="text-gray-300">/</li>
              <li className="text-dark font-medium">{car.persian_name}</li>
            </ol>
          </nav>

          {/* Hero section — Gallery + Info side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* LEFT: Image Gallery */}
            <div>
              <CarImageGallery
                mainImage={car.main_image}
                gallery={car.gallery || []}
                persianName={car.persian_name}
              />
            </div>

            {/* RIGHT: Car info */}
            <div className="flex flex-col">
              {/* Brand + Name */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-accent/20 text-accent-dark text-xs font-bold rounded-full mb-3">
                  {car.brand}
                </span>
                <h1 className="font-poppins text-3xl md:text-4xl font-extrabold text-dark leading-tight">
                  {car.persian_name}
                </h1>
                <p className="text-gray mt-1 text-sm">
                  {car.year} • {car.transmission_display} • {car.fuel_type_display}
                </p>
              </div>

              {/* Price */}
              {car.price && (
                <div className="bg-gradient-to-l from-accent/10 to-accent/5 border border-accent/30 rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray font-medium mb-1">قیمت</p>
                  <p className="text-2xl font-extrabold text-dark font-poppins">
                    {new Intl.NumberFormat('fa-IR').format(Number(car.price))}
                    <span className="text-sm font-normal text-gray mr-1">تومان</span>
                  </p>
                </div>
              )}

              {/* Description */}
              {car.description && (
                <p className="text-gray leading-relaxed mb-6">{car.description}</p>
              )}

              {/* Specs grid */}
              {hasSpecs && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <SpecItem icon="year" label="سال تولید" value={String(car.year)} />
                  <SpecItem icon="brand" label="کشور سازنده" value={car.manufacturer} />
                  <SpecItem icon="fuel" label="نوع سوخت" value={car.fuel_type_display} />
                  <SpecItem icon="transmission" label="گیربکس" value={car.transmission_display} />
                  <SpecItem icon="body" label="نوع بدنه" value={car.body_type} />
                  <SpecItem icon="color" label="رنگ بدنه" value={car.color} />
                  <SpecItem icon="engine" label="موتور" value={car.engine} />
                  <SpecItem icon="country" label="برند" value={car.brand} />
                </div>
              )}

              {/* CTA buttons */}
              <CarCTAButtons
                carName={car.persian_name}
                phoneHref="tel:+982188422001"
              />
            </div>
          </div>

          {/* Tabs section — Technical description + PDF Catalog */}
          <div className="mt-16 bg-white rounded-[14px] shadow-card p-6 md:p-8">
            <Tabs
              labels={[
                'توضیحات فنی',
                ...(car.catalog_file ? ['کاتالوگ PDF'] : []),
              ]}
            >
              {/* Tab 1 – Technical description */}
              <div className="prose prose-sm max-w-none text-gray leading-relaxed">
                {car.technical_description ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: car.technical_description }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-gray">توضیحات فنی برای این خودرو ثبت نشده است.</p>
                  </div>
                )}
              </div>

              {/* Tab 2 – PDF catalogue (only if catalog exists) */}
              {car.catalog_file && (
                <PdfViewer
                  pdfUrl={car.catalog_file}
                  title={`کاتالوگ ${car.persian_name}`}
                />
              )}
            </Tabs>
          </div>
        </div>

        {/* Related cars slider */}
        <div className="wrap mt-16">
          <RelatedCarsSlider currentSlug={car.slug} />
        </div>
      </main>
      <Footer />
    </>
  )
}
