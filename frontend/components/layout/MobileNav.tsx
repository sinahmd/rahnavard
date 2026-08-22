'use client'

import Link from 'next/link'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  links: { href: string; label: string }[]
}

export default function MobileNav({ isOpen, onClose, links }: MobileNavProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Navigation Panel */}
      <nav
        className={`fixed top-0 bottom-0 left-0 w-[78%] max-w-[300px] bg-dark z-50 transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-24 px-7 pb-7">
          <ul className="flex flex-col gap-[22px]">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="text-white text-[17px] font-medium hover:opacity-100 opacity-92 transition-opacity"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
