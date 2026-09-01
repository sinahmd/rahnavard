'use client'

import { useEffect, useRef, useState } from 'react'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { apiUrl } from "@/lib/apiUrl"
import { useSettings } from '@/contexts/SettingsContext'


interface WhyFeature {
  id: number
  title: string
  description: string
  icon?: string
}

export default function WhyRahnavard() {
  const sectionRef = useRef<HTMLElement>(null)
  const settings = useSettings()
  const [features, setFeatures] = useState<WhyFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(apiUrl('/api/v1/why-features/'))
        if (res.ok) {
          const data = await res.json()
          setFeatures(data.results || data || [])
        }
      } catch (error) {
        console.error('Error fetching why section data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  return (
    <section id="why" ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white py-20">
      <div className="absolute inset-0 opacity-5 z-[1]">
        <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.4,-0.9C86.8,14.4,81,28.9,72.4,41.2C63.8,53.5,52.4,63.7,39.4,71.1C26.4,78.5,11.8,83.2,-2.4,87C-16.5,90.8,-30.2,93.7,-42.5,89.1C-54.8,84.5,-65.7,72.4,-73.4,59C-81.1,45.6,-85.6,30.9,-87.2,16.1C-88.8,1.3,-87.5,-13.6,-82.1,-27.1C-76.7,-40.5,-67.2,-52.5,-55.3,-61.1C-43.4,-69.7,-29.1,-74.9,-14.7,-78.7C-0.3,-82.5,14.3,-84.9,28.1,-83.3C41.9,-81.7,54.9,-76.1,44.7,-76.4Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div className="relative z-[2] text-center max-w-[900px] mx-auto px-8">
        <h2 className="text-[42px] font-black text-dark mb-7 opacity-0 scale-95 animate-fade-in-up">
          {settings.why_title}
        </h2>
        {settings.why_description && (
          <p className="text-[17.5px] leading-[1.9] text-gray opacity-0 scale-95 animate-fade-in-up [animation-delay:200ms]">
            {settings.why_description}
          </p>
        )}

        {loading ? (
          <div className="mt-12 text-gray">در حال بارگذاری...</div>
        ) : features.length === 0 ? (
          <div className="mt-12 text-gray">ویژگی‌ای یافت نشد. از پنل مدیریت ویژگی اضافه کنید.</div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-10 ${settings.why_description ? 'mt-12' : 'mt-8'}`}>
            {features.map((feature) => (
              <div key={feature.id} className="why-feature reveal flex flex-col items-center text-center p-6">
                <div className="w-12 h-12 mx-auto mb-5 flex items-center justify-center">
                  {feature.icon ? (
                    <OptimizedImage
                      src={apiUrl(feature.icon)}
                      alt={feature.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <svg className="w-10 h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-[22px] font-extrabold text-dark mb-2.5">{feature.title}</h3>
                <p className="text-[15px] text-gray leading-[1.7]">{feature.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
