'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useSettings } from '@/contexts/SettingsContext'
import { apiUrl } from '@/lib/apiUrl'

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string
  published_at: string
}

export default function LatestArticles() {
  const sectionRef = useRef<HTMLElement>(null)
  const settings = useSettings()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(apiUrl('/api/v1/articles/'))
        if (res.ok) {
          const data = await res.json()
          setArticles((data.results || data || []).slice(0, 3))
        }
      } catch (error) {
        console.error('Error fetching articles:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )

    const elements = sectionRef.current?.querySelectorAll('.reveal-right, .reveal-scale')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [articles])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fa-IR')
    } catch {
      return ''
    }
  }

  return (
    <section id="articles" ref={sectionRef} className="bg-white">
      <div className="wrap">
        <div className="section-head reveal-right">
          <span className="eyebrow">اخبار</span>
          <h2 className="section-title">{settings.articles_section_title}</h2>
          <p>{settings.articles_section_description}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray">در حال بارگذاری...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-gray">
            مقاله‌ای یافت نشد. از پنل مدیریت مقاله اضافه کنید.
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="article-card reveal-scale bg-white rounded-[14px] overflow-hidden shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1"
              >
                <div className="h-40 bg-gradient-to-br from-[#ffeca1] to-white flex items-center justify-center relative overflow-hidden">
                  {article.cover_image ? (
                    <OptimizedImage
                      src={article.cover_image}
                      alt={article.title}
                      width={400}
                      height={160}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-[120deg] from-accent/12 to-transparent" />
                      <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </>
                  )}
                </div>
                <div className="p-[22px] pb-6">
                  {article.published_at && (
                    <span className="text-[12.5px] text-accent-dark font-bold mb-2 block">
                      {formatDate(article.published_at)}
                    </span>
                  )}
                  <h4 className="text-[17px] font-bold mb-2.5">{article.title}</h4>
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
          <div className="text-center mt-10">
            <Link href="/articles" className="btn btn-outline">
              مشاهده همه مقالات
            </Link>
          </div>
          </>
        )}
      </div>
    </section>
  )
}
