/**
 * Wire shape of the backend's additive `*_variants` fields (Phase 4A,
 * `apps/core/image_variants.py`): same-origin `/media/…` URLs for the
 * generated WebP set plus a `blur` data URL for next/image placeholders.
 *
 * Optional everywhere — responses from before the variant backfill omit the
 * fields entirely or carry `null`, and every consumer must degrade to the
 * original URL / no placeholder in that case.
 */
export interface ImageVariants {
  /** WebP re-encode at the original dimensions. */
  webp: string
  /** Thumbnail fitted inside a 400×300 box (aspect preserved, no upscale). */
  sm: string
  /** Thumbnail fitted inside an 800×600 box. */
  md: string
  /** Thumbnail fitted inside a 1600×1200 box. */
  lg: string
  /** 10px-wide WebP placeholder file. */
  lqip: string
  /** The LQIP file as a base64 data URL, ready for blur treatment. */
  blur: string
}
