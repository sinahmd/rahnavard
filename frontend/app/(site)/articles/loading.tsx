import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ArticlesLoading() {
  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <div className="wrap">
          {/* Page Header */}
          <div className="mb-8">
            <span className="eyebrow">اخبار</span>
            <h1 className="section-title">مقاله و اطلاعیه</h1>
            <p className="text-gray">
              آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.
            </p>
          </div>

          {/* Search bar skeleton */}
          <div className="mb-8 max-w-[480px]">
            <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[14px] shadow-card overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
