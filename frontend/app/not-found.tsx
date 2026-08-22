import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20 min-h-screen flex items-center justify-center">
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
      <Footer />
    </>
  )
}
