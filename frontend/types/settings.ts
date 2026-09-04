/**
 * Wire shape for SiteSettings, mirroring SiteSettingsSerializer
 * (`backend/apps/core/serializers.py`). Returned by both the public
 * `/api/v1/settings/` and admin `/api/v1/admin/settings/` endpoints.
 */

export interface SiteSettings {
  site_name: string
  site_description: string
  logo: string | null
  phone: string
  address: string
  instagram: string
  telegram: string
  whatsapp: string
  hero_cta_primary_text: string
  hero_cta_primary_link: string
  hero_cta_secondary_text: string
  hero_cta_secondary_link: string
  why_title: string
  why_description: string
  cars_section_title: string
  cars_section_description: string
  articles_section_title: string
  articles_section_description: string
  branches_section_title: string
  form_title: string
  form_description: string
  footer_description: string
  footer_copyright: string
  default_og_image: string | null
}
