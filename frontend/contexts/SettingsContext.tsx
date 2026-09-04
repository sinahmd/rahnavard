'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SiteSettings } from '@/types/settings'

const defaults: SiteSettings = {
  site_name: 'راهنورد خودرو',
  site_description: '',
  logo: null,
  phone: '۰۹۱۱ ۲۱۰ ۰۸ ۰۰',
  address: 'مازندران، ساری، میدان خزر ،کمربندی شرقی ، ابتدای کوی دادگستری',
  instagram: '',
  telegram: '',
  whatsapp: '',
  hero_cta_primary_text: 'مشاهده خودروها',
  hero_cta_primary_link: '#cars',
  hero_cta_secondary_text: 'درخواست مشاوره',
  hero_cta_secondary_link: '#consult',
  why_title: 'چرا راهنورد خودرو؟',
  why_description: '',
  cars_section_title: 'خودروهای ما',
  cars_section_description: 'مجموعه‌ای منتخب از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی رسمی.',
  articles_section_title: 'مقاله و اطلاعیه',
  articles_section_description: 'آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.',
  branches_section_title: 'شعب راهنورد خودرو',
  form_title: 'درخواست خود را برای ما ارسال نمایید',
  form_description: 'همکاران ما در کوتاه‌ترین زمان ممکن با شما تماس خواهند گرفت.',
  footer_description: 'راهنورد خودرو ، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا با بیش از یک دهه تجربه در خدمت مشتریان.',
  footer_copyright: 'راهنورد خودرو. تمامی حقوق محفوظ است.',
  default_og_image: null,
}

const SettingsContext = createContext<SiteSettings>(defaults)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaults)

  useEffect(() => {
    fetch('/api/v1/settings/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {})
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
