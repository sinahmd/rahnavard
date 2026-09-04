'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import OptimizedImage from '@/components/ui/OptimizedImage'
import MobileNav from './MobileNav'
import type { SiteSettings } from '@/types/settings'

function getNavLinks(pathname: string) {
  const isHome = pathname === '/'
  return [
    { href: isHome ? '#top' : '/', label: 'خانه' },
    { href: isHome ? '#why' : '/#why', label: 'درباره ما' },
    { href: isHome ? '#cars' : '/cars', label: 'خودروها' },
    { href: isHome ? '#articles' : '/articles', label: 'مقالات' },
    { href: isHome ? '#branches' : '/#branches', label: 'شعب' },
    { href: isHome ? '#consult' : '/#consult', label: 'تماس با ما' },
  ]
}

export default function Header({ settings }: { settings: SiteSettings }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = getNavLinks(pathname)
  const isHome = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        !isHome || isScrolled
          ? 'bg-[rgba(254,252,245,0.92)] shadow-[0_2px_18px_rgba(0,0,0,0.06)] py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="wrap flex items-center justify-center min-h-[44px] relative">
        {/* Logo */}
        <Link
          href="/"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center h-[44px] z-10 shrink-0"
        >
          {settings.logo ? (
            <OptimizedImage
              src={settings.logo}
              alt="راهنورد خودرو"
              width={150}
              height={38}
              className={`h-[38px] w-auto max-w-none transition-all duration-300 ${
                !isHome || isScrolled ? 'brightness-0' : 'brightness-0 invert'
              }`}
              priority
            />
          ) : (
            <span className={`text-xl font-black transition-all duration-300 ${
              !isHome || isScrolled ? 'text-dark' : 'text-white'
            }`}>
              راهنورد
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-[34px] h-[44px]">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-flex items-center h-full text-[15px] font-medium leading-none opacity-92 hover:opacity-100 transition-opacity relative ${
                    !isHome || isScrolled ? 'text-dark' : 'text-white'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden flex flex-col justify-center gap-[5px] bg-none border-none cursor-pointer p-1.5 h-[44px] mr-auto"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
        >
          <span
            className={`w-6 h-0.5 rounded-sm transition-all duration-300 origin-center ${
              isMobileMenuOpen
                ? `translate-y-[5.5px] rotate-45 ${!isHome || isScrolled ? 'bg-dark' : 'bg-white'}`
                : !isHome || isScrolled ? 'bg-dark' : 'bg-white'
            }`}
          />
          <span
            className={`w-6 h-0.5 rounded-sm transition-all duration-300 ${
              isMobileMenuOpen
                ? 'opacity-0 scale-0'
                : !isHome || isScrolled ? 'bg-dark' : 'bg-white'
            }`}
          />
          <span
            className={`w-6 h-0.5 rounded-sm transition-all duration-300 origin-center ${
              isMobileMenuOpen
                ? `-translate-y-[5.5px] -rotate-45 ${!isHome || isScrolled ? 'bg-dark' : 'bg-white'}`
                : !isHome || isScrolled ? 'bg-dark' : 'bg-white'
            }`}
          />
        </button>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        links={navLinks}
      />
    </header>
  )
}
