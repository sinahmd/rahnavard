/**
 * Server-only settings data layer.
 *
 * `getSiteSettings()` is called from app/(site)/layout.tsx and the home
 * page; Next fetch dedupe collapses repeated calls in one request into a
 * single backend hit. The payload is merged over Persian defaults so the
 * public site always renders even if the endpoint is down (matching the
 * old SettingsContext behavior — settings must never take down the site).
 *
 * Server-only: reads `BACKEND_INTERNAL_URL` via lib/data/media.ts; never
 * runs in the browser and never touches cookies/localStorage.
 */

import type { SiteSettings } from '@/types/settings'
import { normalizeMediaUrls } from './media'
import { fetchDataJson } from './request'

export const DEFAULT_SETTINGS: SiteSettings = {
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

const REVALIDATE_SECONDS = 60

/**
 * Fetch site settings over BACKEND_INTERNAL_URL with ISR-style
 * revalidation. Never throws: on any failure the Persian defaults are
 * returned so the public site still renders.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const data = await fetchDataJson<Record<string, unknown>>('/api/v1/settings/', {
    revalidate: REVALIDATE_SECONDS,
  })
  if (data === null) return DEFAULT_SETTINGS
  const normalized = normalizeMediaUrls(data, ['logo', 'default_og_image'])
  return { ...DEFAULT_SETTINGS, ...(normalized as Partial<SiteSettings>) }
}