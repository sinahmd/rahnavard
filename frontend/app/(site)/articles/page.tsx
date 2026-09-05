import type { Metadata } from 'next'
import ArticlesExplorer from '@/components/site/ArticlesExplorer'
import { parseArticleListQuery } from '@/lib/data/listQuery'
import { getArticlesPage } from '@/lib/data/article'

export const metadata: Metadata = {
  title: 'مقاله و اطلاعیه | راهنورد خودرو',
  description: 'آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.',
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * /articles — server shell (Phase 3 Step B). Same contract as /cars: parse
 * the URL query, fetch the matching first page on the server, and hand the
 * snapshot to ArticlesExplorer so the island skips its duplicate fetch.
 */
export default async function ArticlesPage({ searchParams }: Props) {
  const query = parseArticleListQuery(
    new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value[value.length - 1] : value]]
      )
    )
  )

  const initialData = await getArticlesPage(query)

  return <ArticlesExplorer initialQuery={query} initialData={initialData} />
}