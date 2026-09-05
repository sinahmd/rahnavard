'use client'

import { useState, useEffect } from 'react'
import { listCars } from '@/lib/api/cars'
import { listArticles } from '@/lib/api/articles'

interface LinkPickerProps {
  value: string
  onChange: (value: string) => void
}

interface CarPick {
  id: number
  slug: string
  persian_name: string
  brand: string
}

interface ArticlePick {
  id: number
  slug: string
  title: string
}

export default function LinkPicker({ value, onChange }: LinkPickerProps) {
  const [cars, setCars] = useState<CarPick[]>([])
  const [articles, setArticles] = useState<ArticlePick[]>([])
  const [loadingCars, setLoadingCars] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [carsError, setCarsError] = useState(false)
  const [articlesError, setArticlesError] = useState(false)

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const data = await listCars()
        setCars(
          data.results.map((c) => ({
            id: c.id,
            slug: c.slug,
            persian_name: c.persian_name,
            brand: c.brand,
          }))
        )
      } catch {
        // Non-critical quick-pick dropdown: degrade to an inline message.
        setCarsError(true)
      } finally {
        setLoadingCars(false)
      }
    }
    fetchCars()
  }, [])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await listArticles()
        setArticles(
          data.results.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
          }))
        )
      } catch {
        setArticlesError(true)
      } finally {
        setLoadingArticles(false)
      }
    }
    fetchArticles()
  }, [])

  const handleCarSelect = (slug: string) => {
    if (slug) {
      onChange(`/cars/${slug}`)
    }
  }

  const handleArticleSelect = (slug: string) => {
    if (slug) {
      onChange(`/articles/${slug}`)
    }
  }

  return (
    <div className="space-y-3">
      {/* Quick pick dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Cars dropdown */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            انتخاب سریع از خودروها
          </label>
          <select
            value=""
            onChange={(e) => handleCarSelect(e.target.value)}
            className="w-full border border-gray-light rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">
              {loadingCars ? 'در حال بارگذاری...' : carsError ? 'خطا در بارگذاری خودروها' : 'انتخاب خودرو...'}
            </option>
            {cars.map((car) => (
              <option key={car.id} value={car.slug}>
                {car.persian_name} ({car.brand})
              </option>
            ))}
          </select>
        </div>

        {/* Articles dropdown */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            انتخاب سریع از مقالات
          </label>
          <select
            value=""
            onChange={(e) => handleArticleSelect(e.target.value)}
            className="w-full border border-gray-light rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">
              {loadingArticles ? 'در حال بارگذاری...' : articlesError ? 'خطا در بارگذاری مقالات' : 'انتخاب مقاله...'}
            </option>
            {articles.map((article) => (
              <option key={article.id} value={article.slug}>
                {article.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">یا لینک دستی</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Free-form text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثلاً /cars/toyota-rav4 یا /#consult یا https://..."
        className="w-full border border-gray-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {/* Current value preview */}
      {value && (
        <div className="bg-gray-50 border border-gray-light rounded-lg px-3 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.236-2.488a4.5 4.5 0 00-6.364-6.364L5.25 8.25" />
          </svg>
          <span className="text-xs text-gray font-mono truncate" dir="ltr">{value}</span>
        </div>
      )}
    </div>
  )
}
