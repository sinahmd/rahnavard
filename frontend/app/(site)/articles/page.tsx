'use client'

import ArticlesExplorer from '@/components/site/ArticlesExplorer'

/**
 * /articles — Step A of the Phase 3 listing migration: the URL is the
 * single source of truth inside ArticlesExplorer (no mirrored search/page
 * state, no URL↔state sync effects). Step B turns this page into a server
 * shell that fetches the initial page and passes it to the island.
 */
export default function ArticlesPage() {
  return <ArticlesExplorer />
}