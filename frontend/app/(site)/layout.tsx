'use client'

import { SettingsProvider } from '@/contexts/SettingsContext'

/**
 * Public (site) layout. Interim phase-3 step: SettingsProvider moves here
 * from the root layout so root stays minimal. The next commit replaces this
 * client provider with a server-side settings fetch (lib/data/settings.ts)
 * rendering Header/Footer with props.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SettingsProvider>{children}</SettingsProvider>
}