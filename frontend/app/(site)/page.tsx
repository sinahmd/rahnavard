import HeroSlider from '@/components/home/HeroSlider'
import WhyRahnavard from '@/components/home/WhyRahnavard'
import FeaturedCars from '@/components/home/FeaturedCars'
import LatestArticles from '@/components/home/LatestArticles'
import Branches from '@/components/home/Branches'
import ConsultationForm from '@/components/home/ConsultationForm'
import JsonLd from '@/components/seo/JsonLd'
import { getSiteSettings } from '@/lib/data/settings'

export default async function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'
  const settings = await getSiteSettings()

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
      <main>
        <HeroSlider />
        <WhyRahnavard settings={settings} />
        <FeaturedCars settings={settings} />
        <LatestArticles settings={settings} />
        <Branches settings={settings} />
        <ConsultationForm settings={settings} />
      </main>
    </>
  )
}