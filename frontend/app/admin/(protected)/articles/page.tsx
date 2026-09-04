'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ArticleAdmin } from '@/types/article'
import {
  deleteArticle,
  listArticles,
  setArticlePublished,
} from '@/lib/api/articles'

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<ArticleAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setError(null)
      const data = await listArticles()
      setArticles(data.results || [])
    } catch {
      setError('خطا در بارگذاری مقالات')
    } finally {
      setLoading(false)
    }
  }

  const togglePublished = async (id: number, currentStatus: boolean) => {
    try {
      setError(null)
      await setArticlePublished(id, !currentStatus)
      await fetchArticles()
    } catch {
      setError('خطا در ذخیره تغییرات')
    }
  }

  const deleteArticleRow = async (id: number) => {
    if (!confirm('آیا از حذف این مقاله اطمینان دارید؟')) return
    try {
      setError(null)
      await deleteArticle(id)
      await fetchArticles()
    } catch {
      setError('خطا در حذف مقاله')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fa-IR')
    } catch {
      return dateString
    }
  }

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت مقالات</h1>
        <Link href="/admin/articles/new" className="bg-accent text-dark px-4 py-2 rounded-lg font-bold hover:bg-accent-dark transition-colors">
          + مقاله جدید
        </Link>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="p-4 font-bold">عنوان</th>
              <th className="p-4 font-bold">اسلاگ</th>
              <th className="p-4 font-bold">وضعیت</th>
              <th className="p-4 font-bold">تاریخ انتشار</th>
              <th className="p-4 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">مقاله‌ای وجود ندارد</td></tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">{article.title}</td>
                  <td className="p-4 font-mono text-sm">{article.slug}</td>
                  <td className="p-4">
                    <button
                      onClick={() => togglePublished(article.id, article.is_published)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${article.is_published ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {article.is_published ? 'منتشر شده' : 'پیش‌نویس'}
                    </button>
                  </td>
                  <td className="p-4">{formatDate(article.published_at)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/articles/${article.id}/edit`} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors">
                        ویرایش
                      </Link>
                      <button onClick={() => deleteArticleRow(article.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
