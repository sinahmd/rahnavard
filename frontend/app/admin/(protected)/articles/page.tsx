'use client'

import Link from 'next/link'
import AdminListPage from '@/components/admin/list/AdminListPage'
import type { ArticleAdmin } from '@/types/article'
import { deleteArticle, listArticles, setArticlePublished } from '@/lib/api/articles'

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('fa-IR')
  } catch {
    return dateString
  }
}

export default function AdminArticlesPage() {
  return (
    <AdminListPage<ArticleAdmin>
      title="مدیریت مقالات"
      createHref="/admin/articles/new"
      createLabel="+ مقاله جدید"
      emptyMessage="مقاله‌ای وجود ندارد"
      errorMessage="خطا در بارگذاری مقالات"
      fetchPage={listArticles}
      rowKey={(article) => article.id}
      columns={[
        { header: 'عنوان', cell: (article) => article.title },
        { header: 'اسلاگ', cell: (article) => <span className="font-mono text-sm">{article.slug}</span> },
        {
          header: 'وضعیت',
          cell: (article, helpers) => (
            <button
              onClick={async () => {
                try {
                  await setArticlePublished(article.id, !article.is_published)
                  helpers.refresh()
                } catch {
                  helpers.error('خطا در ذخیره تغییرات')
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                article.is_published ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {article.is_published ? 'منتشر شده' : 'پیش‌نویس'}
            </button>
          ),
        },
        { header: 'تاریخ انتشار', cell: (article) => formatDate(article.published_at) },
        {
          header: 'عملیات',
          cell: (article, helpers) => (
            <div className="flex gap-2">
              <Link
                href={`/admin/articles/${article.id}/edit`}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                ویرایش
              </Link>
              <button
                onClick={async () => {
                  if (!confirm('آیا از حذف این مقاله اطمینان دارید؟')) return
                  try {
                    await deleteArticle(article.id)
                    helpers.refresh()
                  } catch {
                    helpers.error('خطا در حذف مقاله')
                  }
                }}
                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
              >
                حذف
              </button>
            </div>
          ),
        },
      ]}
    />
  )
}
