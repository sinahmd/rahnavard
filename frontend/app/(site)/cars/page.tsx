import type { Metadata } from 'next'
import CarsExplorer from '@/components/site/CarsExplorer'
import { parseCarListQuery } from '@/lib/data/listQuery'
import { getCarsPage, getCarFilterOptions } from '@/lib/data/car'

export const metadata: Metadata = {
  title: 'خودروهای ما | راهنورد خودرو',
  description: 'مجموعه‌ای از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی رسمی.',
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * /cars — server shell (Phase 3 Step B). Parses the URL query with the same
 * pure helper the island uses, fetches the matching first page + filter
 * options on the server, and passes the snapshot to CarsExplorer. The island
 * skips its initial fetch because the URL equals initialQuery, so the first
 * HTML contains the actual cards and hydration adds no duplicate request.
 */
export default async function CarsPage({ searchParams }: Props) {
  const query = parseCarListQuery(
    new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value[value.length - 1] : value]]
      )
    )
  )

  const [initialData, initialFilterOptions] = await Promise.all([
    getCarsPage(query),
    getCarFilterOptions(),
  ])

  return (
    <CarsExplorer
      initialQuery={query}
      initialData={initialData}
      initialFilterOptions={initialFilterOptions}
    />
  )
}