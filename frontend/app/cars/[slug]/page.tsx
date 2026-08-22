import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JsonLd from '@/components/seo/JsonLd'

// This will be fetched from API based on slug
const carsData: Record<string, any> = {
  'hyundai-elantra': {
    brand: 'Hyundai',
    model: 'Elantra',
    persianName: 'هیوندای النترا',
    image: '/images/cars/hyundai-elantra.webp',
    year: 2025,
    fuelType: 'بنزینی',
    transmission: 'اتوماتیک',
    engine: '2.0L 4-Cylinder',
    description: 'هیوندای النترا یکی از محبوب‌ترین سدان‌های کلاس C بازار ایران است. این خودرو با طراحی مدرن، مصرف سوخت بهینه و امکانات رفاهی مناسب، انتخابی ایده‌آل برای خانواده‌ها و جوانان است.',
    slug: 'hyundai-elantra',
  },
  'kia-k4': {
    brand: 'Kia',
    model: 'K4',
    persianName: 'کیا K4',
    image: '/images/cars/kia-k4.webp',
    year: 2025,
    fuelType: 'بنزینی',
    transmission: 'اتوماتیک',
    engine: '2.0L 4-Cylinder',
    description: 'کیا K4 با طراحی جسورانه و امکانات پیشرفته، یکی از جدیدترین محصولات کیا در بازار ایران است.',
    slug: 'kia-k4',
  },
  'toyota-rav4-hybrid': {
    brand: 'Toyota',
    model: 'RAV4 Hybrid',
    persianName: 'تویوتا راو۴ هیبرید',
    image: '/images/cars/toyota-rav4-hybrid.webp',
    year: 2025,
    fuelType: 'هیبریدی',
    transmission: 'اتوماتیک',
    engine: '2.5L Hybrid',
    description: 'تویوتا RAV4 هیبرید یکی از محبوب‌ترین کراس‌اوورهای هیبریدی جهان است. با مصرف سوخت فوق‌العاده پایین و فضای داخلی جادار، انتخابی عالی برای خانواده‌ها.',
    slug: 'toyota-rav4-hybrid',
  },
  'toyota-corolla-cross-hybrid': {
    brand: 'Toyota',
    model: 'Corolla Cross Hybrid',
    persianName: 'تویوتا کرولا کراس هیبرید',
    image: '/images/cars/toyota-corolla-cross-hybrid.webp',
    year: 2025,
    fuelType: 'هیبریدی',
    transmission: 'اتوماتیک',
    engine: '2.0L Hybrid',
    description: 'تویوتا کرولا کراس هیبرید ترکیبی از محبوبیت کرولا و کاربردی بودن یک کراس‌اوور است.',
    slug: 'toyota-corolla-cross-hybrid',
  },
  'toyota-corolla-hybrid': {
    brand: 'Toyota',
    model: 'Corolla Hybrid',
    persianName: 'تویوتا کرولا هیبرید',
    image: '/images/cars/toyota-corolla-hybrid.webp',
    year: 2025,
    fuelType: 'هیبریدی',
    transmission: 'اتوماتیک',
    engine: '1.8L Hybrid',
    description: 'تویوتا کرولا هیبرید با بیش از 50 میلیون فروش در جهان، پرفروش‌ترین خودروی تاریخ است.',
    slug: 'toyota-corolla-hybrid',
  },
}

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = carsData[params.slug]

  if (!car) {
    return {
      title: 'خودرو یافت نشد | راهنورد خودرو',
    }
  }

  return {
    title: `${car.persianName} | راهنورد خودرو`,
    description: car.description,
    openGraph: {
      title: `${car.persianName} | راهنورد خودرو`,
      description: car.description,
      images: [
        {
          url: car.image,
          width: 800,
          height: 600,
          alt: car.persianName,
        },
      ],
    },
  }
}

export default function CarDetailPage({ params }: Props) {
  const car = carsData[params.slug]

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

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: car.persianName,
          brand: {
            '@type': 'Brand',
            name: car.brand,
          },
          model: car.model,
          image: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'}${car.image}`,
          vehicleConfiguration: car.engine,
          fuelType: car.fuelType,
          vehicleTransmission: car.transmission,
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
              <li className="text-dark font-medium">{car.persianName}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Car Image */}
            <div className="bg-white rounded-[14px] p-8 shadow-card flex items-center justify-center aspect-[4/3]">
              <Image
                src={car.image}
                alt={car.persianName}
                width={600}
                height={450}
                className="max-w-full max-h-full object-contain"
                priority
              />
            </div>

            {/* Car Info */}
            <div>
              <span className="font-poppins text-sm tracking-[2px] text-gray font-semibold uppercase">
                {car.brand}
              </span>
              <h1 className="font-poppins text-3xl md:text-4xl font-bold mt-2 mb-6">
                {car.model}
              </h1>
              <p className="text-gray text-lg leading-relaxed mb-8">
                {car.description}
              </p>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">سال ساخت</span>
                  <span className="font-bold">{car.year}</span>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">نوع سوخت</span>
                  <span className="font-bold">{car.fuelType}</span>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">گیربکس</span>
                  <span className="font-bold">{car.transmission}</span>
                </div>
                <div className="bg-bg rounded-xl p-4">
                  <span className="text-sm text-gray block mb-1">موتور</span>
                  <span className="font-bold">{car.engine}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex gap-4">
                <a href="#consult" className="btn btn-primary flex-1">
                  درخواست مشاوره
                </a>
                <a href="tel:+989112100800" className="btn btn-dark flex-1">
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
