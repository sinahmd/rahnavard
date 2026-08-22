import Header from '@/components/layout/Header'
import HeroSlider from '@/components/home/HeroSlider'
import WhyRahnavard from '@/components/home/WhyRahnavard'
import FeaturedCars from '@/components/home/FeaturedCars'
import LatestArticles from '@/components/home/LatestArticles'
import Branches from '@/components/home/Branches'
import ConsultationForm from '@/components/home/ConsultationForm'
import Footer from '@/components/layout/Footer'
import JsonLd from '@/components/seo/JsonLd'

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'راهنورد خودرو',
          url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co',
          logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'}/images/branding/logo.png`,
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
      <Header />
      <main>
        <HeroSlider />
        <WhyRahnavard />
        <FeaturedCars />
        <LatestArticles />
        <Branches />
        <ConsultationForm />
      </main>
      <Footer />
    </>
  )
}
