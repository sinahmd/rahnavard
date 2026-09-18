'use client'

import Image, { ImageProps } from 'next/image'
import { SyntheticEvent, useRef } from 'react'
import type { ImageVariants } from '@/types/media'

/**
 * The project's single image component: next/image with the Phase 4A
 * backend variant pipeline (`types/media.ts`) wired in.
 *
 * Variant selection
 * -----------------
 * `tier` picks which generated thumbnail fits the layout slot — `sm`
 * (400×300 box) for cards/thumbnails, `md` (800×600) for detail viewers,
 * `lg` (1600×1200) for full-bleed/hero. When omitted, the tier derives
 * from the `width`/`fill` props, so the server-rendered markup is
 * deterministic (no viewport observers, no hydration mismatch).
 *
 * Why media URLs stay `unoptimized`
 * --------------------------------
 * next/image's optimizer would resize `/media/…` on demand by fetching it
 * from inside the frontend container — but that container has no media
 * volume (nginx owns `/media/` in dev and prod), so the optimizer 404s.
 * The backend variant set IS the responsive pipeline: pre-generated WebP
 * tiers served statically by nginx with far-future caching, and no runtime
 * image processing anywhere (plan §7.3). Non-media srcs keep the
 * optimizer, exactly as before.
 *
 * Error fallback
 * --------------
 * Event-driven, no state: on a load error the img advances to the next
 * entry of a fallback chain (variant tier → original) and stops handling
 * once exhausted — the browser's default broken-image state is the final
 * fallback. The chain only ever contains media URLs, so a failing variant
 * can never reroute into the (media-incapable) optimizer and loop.
 */

export type VariantTier = 'sm' | 'md' | 'lg'

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string
  /** The record's additive `*_variants` field, when the API provides one. */
  variants?: ImageVariants | null
  /** Which generated thumbnail fits the slot (default: derived from width/fill). */
  tier?: VariantTier
}

function isLocalMedia(src: string): boolean {
  return src.startsWith('/media/') || src.includes('rahnavard.co/media/')
}

function resolveTier(props: Pick<OptimizedImageProps, 'tier' | 'fill' | 'width'>): VariantTier {
  if (props.tier) return props.tier
  if (props.fill) return 'lg'
  const width = typeof props.width === 'number' ? props.width : Number(props.width) || 0
  if (width > 0 && width <= 400) return 'sm'
  if (width > 0 && width <= 800) return 'md'
  return 'lg'
}

function fallbackChain(src: string, variants: ImageVariants | null | undefined, tier: VariantTier): string[] {
  const variantUrl = isLocalMedia(src) && variants ? variants[tier] : null
  return variantUrl && variantUrl !== src ? [variantUrl, src] : [src]
}

export default function OptimizedImage({
  src,
  variants,
  tier: tierProp,
  onError,
  ...props
}: OptimizedImageProps) {
  const tier = resolveTier({ tier: tierProp, fill: props.fill, width: props.width })
  const chain = fallbackChain(src, variants, tier)
  // Fallback progress, keyed to the current src so a new image resets the
  // chain and error events from a previous src are ignored as stale.
  const stateRef = useRef({ src, index: 0 })
  if (stateRef.current.src !== src) stateRef.current = { src, index: 0 }

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const state = stateRef.current
    if (state.src !== src) return
    state.index += 1
    const next = chain[state.index]
    if (next) {
      event.currentTarget.src = next
      return
    }
    if (state.index === chain.length) {
      // Exactly the first error with nothing left to try: forward once, then
      // stop handling so the browser shows its default broken-image state.
      // The chain only ever holds media URLs, so this can never reroute into
      // a non-media (optimizer) URL and loop.
      onError?.(event)
    }
  }

  const blurUrl = variants?.blur

  return (
    <Image
      {...props}
      src={chain[0]}
      alt={props.alt || ''}
      unoptimized={isLocalMedia(chain[0]) ? true : props.unoptimized}
      placeholder={blurUrl ? 'blur' : props.placeholder}
      blurDataURL={blurUrl ?? props.blurDataURL}
      onError={handleError}
    />
  )
}
