/**
 * Wire shape for HeroSlide, mirroring HeroSlideSerializer
 * (`backend/apps/core/serializers.py`).
 */

export interface HeroSlide {
  id: number
  title: string
  image: string | null
  alt_text: string
  link: string
  is_active: boolean
  display_order: number
}
