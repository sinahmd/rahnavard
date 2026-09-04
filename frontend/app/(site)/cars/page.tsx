'use client'

import CarsExplorer from '@/components/site/CarsExplorer'

/**
 * /cars — Step A of the Phase 3 listing migration: the URL is the single
 * source of truth inside CarsExplorer (no mirrored filter/sort/page state,
 * no URL↔state sync effects). Step B turns this page into a server shell
 * that fetches the initial page and passes it to the island.
 */
export default function CarsPage() {
  return <CarsExplorer />
}