'use client'

import { useEffect, useRef, useState } from 'react'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useSettings } from '@/contexts/SettingsContext'


interface Branch {
  id: number
  name: string
  address: string
  phone: string
  map_url: string
  map_image: string
}

export default function Branches() {
  const sectionRef = useRef<HTMLElement>(null)
  const settings = useSettings()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/branches/')
        if (res.ok) {
          const data = await res.json()
          setBranches(data.results || data || [])
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
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

    const elements = sectionRef.current?.querySelectorAll('.reveal-left, .reveal-scale')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [branches])

  return (
    <section id="branches" ref={sectionRef} className="bg-bg">
      <div className="wrap">
        <div className="section-head reveal-left">
          <span className="eyebrow">دفاتر ما</span>
          <h2 className="section-title">{settings.branches_section_title}</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray">در حال بارگذاری...</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-gray">
            شعبه‌ای یافت نشد. از پنل مدیریت شعبه اضافه کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="branch-card reveal-scale bg-white rounded-[14px] p-8 shadow-card flex flex-col md:flex-row items-start gap-[18px] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-[25px] h-[25px] rounded-full bg-accent flex items-center justify-center mt-1">
                  <svg className="w-[22px] h-[22px] stroke-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h4 className="text-[19px] font-extrabold mb-2.5">{branch.name}</h4>
                  <p className="text-gray text-[14.5px] mb-1.5">{branch.address}</p>
                  {branch.phone && (
                    <a href={`tel:${branch.phone}`} className="text-dark font-bold mt-2.5 inline-block ltr text-right" style={{ unicodeBidi: 'embed' }}>
                      {branch.phone}
                    </a>
                  )}
                </div>

                {branch.map_image && (
                  <>
                    <a href={branch.map_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-[180px] h-[180px] rounded-4 overflow-hidden border border-gray-light cursor-pointer transition-all hover:scale-[1.02] hover:shadow-card-hover md:block hidden" title="مشاهده در نقشه">
                      <OptimizedImage src={branch.map_image} alt={`موقعیت ${branch.name}`} width={180} height={180} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                    <a href={branch.map_url} target="_blank" rel="noopener noreferrer" className="md:hidden w-full h-[200px] rounded-[14px] overflow-hidden border border-gray-light cursor-pointer mt-4" title="مشاهده در نقشه">
                      <OptimizedImage src={branch.map_image} alt={`موقعیت ${branch.name}`} width={400} height={200} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
