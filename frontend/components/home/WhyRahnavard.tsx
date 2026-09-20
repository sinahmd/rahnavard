'use client'

import { useEffect, useRef } from 'react'
import OptimizedImage from '@/components/ui/OptimizedImage'
import type { WhyFeature } from '@/types/feature'
import type { SiteSettings } from '@/types/settings'

/**
 * «چرا راهنورد» — anatomy mirrors the approved artwork
 * (assets/why-rahnavard-bg/why-rahnavard-bg-with-text.png):
 * center column carries the header (Latin kicker, one-line bold Persian
 * title, small gray description, amber dash); features split into two side
 * columns (01–03 first column = visual right in RTL, 04–06 third column =
 * visual left), leaving the center over the car photo empty. Features are
 * pure typography — an uploaded icon renders small beside the title, and
 * there is NO default icon.
 *
 * Background: one managed full-bleed layer at every breakpoint —
 * absolute inset-0 object-cover of the ≈16:9 artwork behind the content,
 * washed lightly for text readability (slightly stronger on mobile, where
 * stacked text crosses the darker road half). Order: header first, then
 * all features.
 * No background image → the decorative SVG returns over plain white.
 */
export default function WhyRahnavard({
  features,
  settings,
}: {
  features: WhyFeature[]
  settings: SiteSettings
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const hasBackground = Boolean(settings.why_background)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )

    const elements = sectionRef.current?.querySelectorAll('.reveal')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [features])

  // Split down the middle: first half in the right column, rest in the left
  // (matches the artwork's 01–03 / 04–06 placement in RTL reading order).
  const half = Math.ceil(features.length / 2)
  const rightColumn = features.slice(0, half)
  const leftColumn = features.slice(half)

  const renderFeature = (feature: WhyFeature, index: number) => (
    <div key={feature.id} className="why-feature reveal text-center">
      <span className="font-poppins text-[15px] font-semibold text-accent" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex items-center justify-center gap-2 mt-1">
        {feature.icon && (
          <OptimizedImage
            src={feature.icon}
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
          />
        )}
        <h3 className="text-[21px] font-bold text-dark">{feature.title}</h3>
      </div>
      <p className="text-[13.5px] leading-[1.8] text-gray-dark mt-1.5">{feature.description}</p>
      <div className="w-6 h-[2px] bg-accent mx-auto mt-3" aria-hidden="true" />
    </div>
  )

  return (
    <section id="why" ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white py-20">
      {hasBackground ? (
        <>
          {/* Managed background (SiteSettings.why_background): decorative —
              empty alt keeps it out of the a11y tree; the lg WebP tier and
              LQIP blur come from the Phase 4A pipeline via OptimizedImage.
              One full-bleed cover layer on every breakpoint. */}
          <div className="pointer-events-none absolute inset-0 z-[1]">
            <OptimizedImage
              src={settings.why_background!}
              variants={settings.why_background_variants}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Readability wash — text overlays the photo on every
                breakpoint; a touch stronger on mobile where the stacked
                content crosses the darker road half. */}
            <div className="absolute inset-0 bg-white/30 md:bg-white/25" />
          </div>
        </>
      ) : (
        <div className="absolute inset-0 opacity-5 z-[1]">
          <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.4,-0.9C86.8,14.4,81,28.9,72.4,41.2C63.8,53.5,52.4,63.7,39.4,71.1C26.4,78.5,11.8,83.2,-2.4,87C-16.5,90.8,-30.2,93.7,-42.5,89.1C-54.8,84.5,-65.7,72.4,-73.4,59C-81.1,45.6,-85.6,30.9,-87.2,16.1C-88.8,1.3,-87.5,-13.6,-82.1,-27.1C-76.7,-40.5,-67.2,-52.5,-55.3,-61.1C-43.4,-69.7,-29.1,-74.9,-14.7,-78.7C-0.3,-82.5,14.3,-84.9,28.1,-83.3C41.9,-81.7,54.9,-76.1,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
      )}

      <div className="relative z-[2] w-full max-w-[1280px] mx-auto px-6 md:px-8">
        {/* Artwork grid: header center, features flanking. DOM order is
            header-first (a11y/SEO + mobile reading order); explicit col-start
            placement positions all three on md+. */}
        <div data-testid="why-grid" className="flex flex-col gap-y-10 md:grid md:grid-cols-[1fr_1.6fr_1fr] md:gap-x-12 md:gap-y-0 md:items-start">
          {/* Center: kicker + one-line title + description + amber dash */}
          <div className="text-center md:col-start-2 md:row-start-1 py-4">
            <p className="font-poppins text-[13px] font-normal tracking-[0.6em] text-dark/90 mb-4 opacity-0 translate-y-[30px] animate-fade-in-up uppercase">
              Why Rahnavard
            </p>
            <h2 className="text-[36px] md:text-[48px] font-bold leading-[1.4] text-dark mb-4 opacity-0 translate-y-[30px] animate-fade-in-up [animation-delay:100ms]">
              {settings.why_title}
            </h2>
            {settings.why_description && (
              <p className="text-[15px] leading-[1.9] text-gray-dark max-w-[460px] mx-auto opacity-0 translate-y-[30px] animate-fade-in-up [animation-delay:200ms]">
                {settings.why_description}
              </p>
            )}
            {hasBackground && (
              <div className="w-6 h-[3px] bg-accent mx-auto mt-6 opacity-0 animate-fade-in-up [animation-delay:300ms]" />
            )}
          </div>

          {/* Features 01–… — grid column 1 = visual RIGHT in RTL, like the artwork */}
          <div className="flex flex-col gap-10 md:col-start-1 md:row-start-1 md:pt-16">
            {rightColumn.map((feature, i) => renderFeature(feature, i))}
          </div>

          {/* Features …–06 — grid column 3 = visual LEFT in RTL */}
          <div className="flex flex-col gap-10 md:col-start-3 md:row-start-1 md:pt-16">
            {leftColumn.map((feature, i) => renderFeature(feature, half + i))}
          </div>
        </div>

        {features.length === 0 && (
          <div className="mt-12 text-gray text-center">ویژگی‌ای یافت نشد. از پنل مدیریت ویژگی اضافه کنید.</div>
        )}
      </div>
    </section>
  )
}
