import HeroSlider from '@/components/home/HeroSlider'
import WhyRahnavard from '@/components/home/WhyRahnavard'
import FeaturedCars from '@/components/home/FeaturedCars'
import LatestArticles from '@/components/home/LatestArticles'
import Branches from '@/components/home/Branches'
import ConsultationForm from '@/components/home/ConsultationForm'
import JsonLd from '@/components/seo/JsonLd'
import { getSiteSettings } from '@/lib/data/settings'
import {
  getHeroSlides,
  getWhyFeatures,
  getFeaturedCars,
  getLatestArticles,
  getBranches,
} from '@/lib/data/home'

export default async function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'

  // Server state: fetched once per request (fetch dedupe collapses the
  // shared /settings/ call with the layout) and passed into the islands.
  const [settings, slides, features, cars, articles, branches] = await Promise.all([
    getSiteSettings(),
    getHeroSlides(),
    getWhyFeatures(),
    getFeaturedCars(),
    getLatestArticles(),
    getBranches(),
  ])

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'راهنورد خودرو',
          url: siteUrl,
          description: 'راهنورد خودرو، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا با بیش از یک دهه تجربه در خدمت مشتریان.',
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+98-911-210-0800',
            contactType: 'customer service',
            availableLanguage: 'Persian',
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'ساری',
            addressRegion: 'مازندران',
            addressCountry: 'IR',
          },
          sameAs: [],
        }}
      />
      <main id="main-content">
        {/* Page-level heading: the hero is an image slider, so the h1 is
            visually hidden (axe page-has-heading-one). */}
        <h1 className="sr-only">راهنورد خودرو</h1>
        <HeroSlider slides={slides} />
        <WhyRahnavard features={features} settings={settings} />
        <FeaturedCars cars={cars} settings={settings} />
        <LatestArticles articles={articles} settings={settings} />
        <Branches branches={branches} settings={settings} />
        <ConsultationForm settings={settings} />
      </main>
    </>
  )
}