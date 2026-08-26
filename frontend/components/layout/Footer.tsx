'use client'

import Link from 'next/link'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useSettings } from '@/contexts/SettingsContext'

const quickLinks = [
  { href: '#why', label: 'درباره ما' },
  { href: '#cars', label: 'خودروها' },
  { href: '#articles', label: 'مقالات' },
  { href: '#consult', label: 'مشاوره' },
]

export default function Footer() {
  const settings = useSettings()

  return (
    <footer className="bg-dark text-white pt-16 pb-6">
      <div className="wrap">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-10 pb-10 border-b border-white/12">
          {/* Logo & Description */}
          <div>
            <Link href="#top" className="inline-block mb-4">
              {settings.logo ? (
                <OptimizedImage
                  src={settings.logo}
                  alt={settings.site_name}
                  width={150}
                  height={34}
                  className="h-[34px] w-auto brightness-0 invert"
                />
              ) : (
                <span className="text-xl font-black text-white">راهنورد</span>
              )}
            </Link>
            <p className="text-white/60 text-[14px] max-w-[320px]">
              {settings.footer_description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-[15px] font-bold mb-[18px]">دسترسی سریع</h5>
            <ul>
              {quickLinks.map((link) => (
                <li key={link.href} className="mb-3">
                  <Link
                    href={link.href}
                    className="text-white/65 text-[14px] transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h5 className="text-[15px] font-bold mb-[18px]">اطلاعات تماس</h5>
            <ul>
              <li className="text-white/60 text-[14px] mb-3">
                {settings.address}
              </li>
              <li className="ltr text-right">
                <a
                  href={`tel:${settings.phone?.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))}`}
                  className="text-white/60 text-[14px] hover:text-accent transition-colors"
                >
                  {settings.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-6 gap-3">
          <p className="text-white/45 text-[13px]">
            {settings.footer_copyright}
          </p>
          <p className="text-white/45 text-[13px]">
            طراحی و توسعه با ❤
          </p>
        </div>
      </div>
    </footer>
  )
}
