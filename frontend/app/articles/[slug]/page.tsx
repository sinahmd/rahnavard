import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JsonLd from '@/components/seo/JsonLd'

// This will be fetched from API based on slug
const articlesData: Record<string, any> = {
  'hybrid-car-buying-guide': {
    title: 'راهنمای خرید خودروی هیبریدی',
    excerpt: 'بررسی مزایای خودروهای هیبریدی و نکات مهم پیش از خرید.',
    date: '۱۲ مرداد ۱۴۰۵',
    publishedAt: '2025-08-03',
    content: `
      <h2>چرا خودروی هیبریدی؟</h2>
      <p>خودروهای هیبریدی با ترکیب موتور بنزینی و الکتریکی، مصرف سوخت را به میزان قابل توجهی کاهش می‌دهند. این خودروها نه تنها به صرفه‌جویی در هزینه سوخت کمک می‌کنند، بلکه تأثیر کمتری بر محیط زیست دارند.</p>

      <h2>مزایای خودروهای هیبریدی</h2>
      <ul>
        <li>مصرف سوخت پایین‌تر نسبت به خودروهای بنزینی</li>
        <li>انتشار کمتر گازهای گلخانه‌ای</li>
        <li>عملکرد بهتر در ترافیک شهری</li>
        <li>عمر طولانی‌تر سیستم ترمز به دلیل بازیابی انرژی</li>
      </ul>

      <h2>نکات مهم پیش از خرید</h2>
      <p>قبل از خرید خودروی هیبریدی، حتماً موارد زیر را در نظر بگیرید:</p>
      <ol>
        <li>نوع هیبرید (کامل، ملایم، پلاگین)</li>
        <li>ظرفیت باتری و گارانتی آن</li>
        <li>مصرف سوخت واقعی در شرایط مختلف</li>
        <li>هزینه نگهداری و تعمیرات</li>
      </ol>
    `,
    slug: 'hybrid-car-buying-guide',
  },
  'new-warranty-terms': {
    title: 'شرایط جدید گارانتی محصولات',
    excerpt: 'اطلاعیه به‌روزرسانی شرایط گارانتی و خدمات پس از فروش.',
    date: '۳ مرداد ۱۴۰۵',
    publishedAt: '2025-07-25',
    content: `
      <h2>شرایط جدید گارانتی</h2>
      <p>راهنورد خودرو با هدف ارتقای رضایت مشتریان، شرایط گارانتی محصولات خود را به‌روزرسانی کرده است.</p>

      <h2>تغییرات اصلی</h2>
      <ul>
        <li>افزایش مدت گارانتی به ۵ سال یا ۱۵۰,۰۰۰ کیلومتر</li>
        <li>پوشش کامل سیستم هیبریدی</li>
        <li>خدمات امداد جاده‌ای رایگان</li>
        <li>سرویس دوره‌ای رایگان تا ۳ سال</li>
      </ul>
    `,
    slug: 'new-warranty-terms',
  },
  'new-products-2025': {
    title: 'معرفی محصولات جدید ۲۰۲۵',
    excerpt: 'نگاهی به تازه‌ترین مدل‌های وارداتی راهنورد خودرو در سال جاری.',
    date: '۲۰ تیر ۱۴۰۵',
    publishedAt: '2025-07-11',
    content: `
      <h2>محصولات جدید ۲۰۲۵</h2>
      <p>راهنورد خودرو در سال ۲۰۲۵ مجموعه‌ای از جدیدترین مدل‌های برندهای معتبر جهانی را به بازار ایران عرضه کرده است.</p>

      <h2>Highlights</h2>
      <ul>
        <li>تویوتا RAV4 هیبرید ۲۰۲۵</li>
        <li>هیوندای النترا ۲۰۲۵</li>
        <li>کیا K4 ۲۰۲۵</li>
        <li>تویوتا کرولا کراس هیبرید</li>
      </ul>
    `,
    slug: 'new-products-2025',
  },
}

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articlesData[params.slug]

  if (!article) {
    return {
      title: 'مقاله یافت نشد | راهنورد خودرو',
    }
  }

  return {
    title: `${article.title} | راهنورد خودرو`,
    description: article.excerpt,
    openGraph: {
      title: `${article.title} | راهنورد خودرو`,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  }
}

export default function ArticleDetailPage({ params }: Props) {
  const article = articlesData[params.slug]

  if (!article) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20">
          <div className="wrap text-center">
            <h1 className="text-3xl font-bold mb-4">مقاله یافت نشد</h1>
            <p className="text-gray mb-8">متأسفانه مقاله مورد نظر شما یافت نشد.</p>
            <Link href="/articles" className="btn btn-primary">
              بازگشت به لیست مقالات
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
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          datePublished: article.publishedAt,
          author: {
            '@type': 'Organization',
            name: 'راهنورد خودرو',
          },
          publisher: {
            '@type': 'Organization',
            name: 'راهنورد خودرو',
          },
        }}
      />
      <Header />
      <main className="pt-32 pb-20">
        <div className="wrap max-w-[800px] mx-auto">
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
                <Link href="/articles" className="hover:text-accent-dark transition-colors">
                  مقالات
                </Link>
              </li>
              <li>/</li>
              <li className="text-dark font-medium">{article.title}</li>
            </ol>
          </nav>

          {/* Article Header */}
          <header className="mb-8">
            <span className="text-sm text-accent-dark font-bold mb-3 block">
              {article.date}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {article.title}
            </h1>
            <p className="text-gray text-lg">
              {article.excerpt}
            </p>
          </header>

          {/* Article Content */}
          <article
            className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-dark prose-p:text-gray prose-p:leading-relaxed prose-li:text-gray prose-a:text-accent-dark hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-gray-light">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-accent-dark font-bold hover:underline"
            >
              <svg
                className="w-4 h-4 rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
              بازگشت به لیست مقالات
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
