'use client'

import { useEffect, useRef, useState } from 'react'

interface WhyFeature {
  id: number
  title: string
  description: string
  icon?: string
}

export default function WhyRahnavard() {
  const sectionRef = useRef<HTMLElement>(null)
  const [features, setFeatures] = useState<WhyFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('چرا راهنورد خودرو؟')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, featuresRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/why-features/`)
        ])

        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (settings.why_title) setTitle(settings.why_title)
          if (settings.why_description) setDescription(settings.why_description)
        }

        if (featuresRes.ok) {
          const data = await featuresRes.json()
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
      <div className="absolute inset-0 bg-cover bg-center opacity-30 z-[1]" style={{ backgroundImage: "url('/images/decorative/ccchaos.svg')" }} />

      <div className="relative z-[2] text-center max-w-[900px] mx-auto px-8">
        <h2 className="text-[42px] font-black text-dark mb-7 opacity-0 scale-95 animate-fade-in-up">
          {title}
        </h2>
        {description && (
          <p className="text-[17.5px] leading-[1.9] text-gray opacity-0 scale-95 animate-fade-in-up [animation-delay:200ms]">
            {description}
          </p>
        )}

        {loading ? (
          <div className="mt-12 text-gray">در حال بارگذاری...</div>
        ) : features.length === 0 ? (
          <div className="mt-12 text-gray">ویژگی‌ای یافت نشد. از پنل مدیریت ویژگی اضافه کنید.</div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-10 ${description ? 'mt-12' : 'mt-8'}`}>
            {features.map((feature) => (
              <div key={feature.id} className="why-feature reveal flex flex-col items-center text-center p-6">
                <div
                  className="w-12 h-12 mx-auto mb-5 bg-contain bg-no-repeat bg-center"
                  style={{ backgroundImage: feature.icon ? `url('${feature.icon}')` : "url('/images/decorative/sssplatter.svg')" }}
                />
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
