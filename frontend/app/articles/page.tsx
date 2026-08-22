import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'مقالات و اخبار | راهنورد خودرو',
  description: 'آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو از راهنورد خودرو.',
}

async function getArticles() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/articles/`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || data || []
  } catch {
    return []
  }
}

export default async function ArticlesPage() {
  const articles = await getArticles()

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('fa-IR')
    } catch {
      return ''
    }
  }

  return (
    <>
      <Header />
      <main className="pt-32 pb-20">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">اخبار</span>
            <h1 className="section-title">مقاله و اطلاعیه</h1>
            <p>آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.</p>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-12 text-gray">
              مقاله‌ای یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: any) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="article-card bg-white rounded-[14px] overflow-hidden shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
                >
                  <div className="h-40 bg-gradient-to-br from-[#ffeca1] to-white flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-[120deg] from-accent/12 to-transparent" />
                  </div>
                  <div className="p-[22px] pb-6">
                    {article.published_at && (
                      <span className="text-[12.5px] text-accent-dark font-bold mb-2 block">
                        {formatDate(article.published_at)}
                      </span>
                    )}
                    <h2 className="text-[17px] font-bold mb-2.5">{article.title}</h2>
                    {article.excerpt && (
                      <p className="text-[14px] text-gray mb-4">{article.excerpt}</p>
                    )}
                    <span className="text-[14px] font-bold text-dark inline-flex items-center gap-1.5 group">
                      مطالعه بیشتر
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </span>
                  </div>
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
