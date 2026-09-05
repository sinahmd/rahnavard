import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getSiteSettings } from '@/lib/data/settings'

/**
 * Root not-found — lives outside the (site) route group (it serves
 * unmatched URLs and bubbled notFound() calls), so it fetches settings
 * itself and renders the same chrome as public pages.
 */
export default async function NotFound() {
  const settings = await getSiteSettings()

  return (
    <>
      <Header settings={settings} />
      <main id="main-content" className="pt-32 pb-20 min-h-screen flex items-center justify-center">
        <div className="wrap text-center">
          <h1 className="text-6xl font-bold mb-4">۴۰۴</h1>
          <h2 className="text-2xl font-bold mb-4">صفحه مورد نظر یافت نشد</h2>
          <p className="text-gray text-lg mb-8">
            متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
          </p>
          <Link href="/" className="btn btn-primary">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </main>
      <Footer settings={settings} />
    </>
  )
}