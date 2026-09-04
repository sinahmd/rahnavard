import type { Metadata } from 'next'
import { SettingsProvider } from '@/contexts/SettingsContext'
import './globals.css'

// NOTE: AuthProvider intentionally lives in app/admin/layout.tsx (not here).
// Scoping auth to the admin subtree keeps anonymous public visitors from
// calling /auth/session/ (whose 401 policy would otherwise redirect them to
// /admin/login). This is a Phase 2 regression fix — the full route-group
// restructure (admin/(protected)) is Phase 3.

export const metadata: Metadata = {
  title: {
    default: 'راهنورد خودرو | وارد کننده خودرو',
    template: '%s | راهنورد خودرو',
  },
  description: 'راهنورد خودرو، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا با بیش از یک دهه تجربه در خدمت مشتریان.',
  keywords: ['خودرو', 'واردات خودرو', 'هیوندای', 'کیا', 'تویوتا', 'راهنورد خودرو'],
  authors: [{ name: 'راهنورد خودرو' }],
  creator: 'راهنورد خودرو',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: '/',
    siteName: 'راهنورد خودرو',
    title: 'راهنورد خودرو | وارد کننده خودرو',
    description: 'راهنورد خودرو، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا با بیش از یک دهه تجربه در خدمت مشتریان.',
    images: [],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'راهنورد خودرو | وارد کننده خودرو',
    description: 'راهنورد خودرو، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا.',
    images: [],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-vazir antialiased">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  )
}
