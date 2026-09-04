import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getSiteSettings } from '@/lib/data/settings'

/**
 * Public (site) layout — server component (Phase 3). Fetches site settings
 * once per request (Next fetch dedupe + revalidate: 60) and renders the
 * Header/Footer chrome with them, so every public page ships its settings
 * in the initial HTML instead of a client fetch + defaults flash.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSiteSettings()

  return (
    <>
      <Header settings={settings} />
      {children}
      <Footer settings={settings} />
    </>
  )
}