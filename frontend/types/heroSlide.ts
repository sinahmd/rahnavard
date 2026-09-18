/**
 * Wire shape for HeroSlide, mirroring HeroSlideSerializer
 * (`backend/apps/core/serializers.py`).
 */

import type { ImageVariants } from './media'

export interface HeroSlide {
  id: number
  title: string
  image: string | null
  /** Additive Phase 4A field; null until the variant set exists on disk. */
  image_variants?: ImageVariants | null
  alt_text: string
  link: string
  is_active: boolean
  display_order: number
}
