import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import OptimizedImage from '../OptimizedImage'
import type { ImageVariants } from '@/types/media'

// The global jest.setup mock strips `unoptimized` (and fill/priority) before
// rendering <img>. This suite's contract includes WHICH srcs are exempt from
// the optimizer, so it replaces that mock with one that preserves the prop as
// a data attribute while stripping the non-DOM props the same way.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, fill, priority, alt, ...props }: Record<string, unknown>) => {
    const imgProps = { ...props } as Record<string, unknown>
    if (unoptimized !== undefined) imgProps['data-unoptimized'] = String(unoptimized)
    if (fill) imgProps['data-fill'] = 'true'
    if (alt !== undefined) imgProps['alt'] = alt
    return <img alt="" {...imgProps} />
  },
}))

const VARIANTS: ImageVariants = {
  webp: '/media/cars/.variants/orig/webp.webp',
  sm: '/media/cars/.variants/orig/sm.webp',
  md: '/media/cars/.variants/orig/md.webp',
  lg: '/media/cars/.variants/orig/lg.webp',
  lqip: '/media/cars/.variants/orig/lqip.webp',
  blur: 'data:image/webp;base64,UklGRhIA',
}

const ORIGINAL = '/media/cars/orig.jpg'

describe('OptimizedImage — variant selection', () => {
  it('uses the sm variant for a card-size slot and keeps the original out of the optimizer', () => {
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={400} height={300} alt="" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', VARIANTS.sm)
    expect(img).toHaveAttribute('data-unoptimized', 'true')
  })

  it('uses the md tier for an 800px slot', () => {
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={800} height={600} alt="" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', VARIANTS.md)
  })

  it('uses the lg tier for fill/hero slots and wide fixed slots', () => {
    const { unmount } = render(
      <OptimizedImage src={ORIGINAL} variants={VARIANTS} fill sizes="100vw" alt="" />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', VARIANTS.lg)
    unmount()
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={1600} height={1200} alt="" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', VARIANTS.lg)
  })

  it('an explicit tier prop wins over the width-derived tier', () => {
    render(
      <OptimizedImage src={ORIGINAL} variants={VARIANTS} width={400} height={300} tier="md" alt="" />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', VARIANTS.md)
  })

  it('falls back to the original when variants are missing or the field is null', () => {
    const { unmount } = render(<OptimizedImage src={ORIGINAL} width={400} height={300} alt="" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', ORIGINAL)
    unmount()
    render(<OptimizedImage src={ORIGINAL} variants={null} width={400} height={300} alt="" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', ORIGINAL)
  })

  it('never applies variant treatment to non-media srcs', () => {
    render(
      <OptimizedImage
        src="https://example.com/photo.jpg"
        variants={VARIANTS}
        width={400}
        height={300}
        alt=""
      />
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    // External srcs keep the optimizer: unoptimized must not be set.
    expect(img).not.toHaveAttribute('data-unoptimized')
  })
})

describe('OptimizedImage — LQIP blur placeholder', () => {
  it('passes the backend LQIP as a blur data URL', () => {
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={400} height={300} alt="" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('placeholder', 'blur')
    expect(img).toHaveAttribute('blurDataURL', VARIANTS.blur)
  })

  it('renders without a blur treatment when no variants exist', () => {
    render(<OptimizedImage src={ORIGINAL} width={400} height={300} alt="" />)
    const img = screen.getByRole('img')
    expect(img).not.toHaveAttribute('placeholder', 'blur')
    expect(img).not.toHaveAttribute('blurDataURL')
  })

  it('blur alone must not change which URL loads', () => {
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={800} height={600} alt="" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', VARIANTS.md)
    expect(img).toHaveAttribute('blurDataURL', VARIANTS.blur)
  })
})

describe('OptimizedImage — error fallback', () => {
  it('advances variant → original on a load error', () => {
    render(<OptimizedImage src={ORIGINAL} variants={VARIANTS} width={400} height={300} alt="" />)
    const img = screen.getByRole('img') as HTMLImageElement
    img.dispatchEvent(new Event('error'))
    expect(img).toHaveAttribute('src', ORIGINAL)
  })

  it('stops after the chain is exhausted (no loops) and forwards the final error', () => {
    const onError = jest.fn()
    render(
      <OptimizedImage src={ORIGINAL} variants={VARIANTS} width={400} height={300} alt="" onError={onError} />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    img.dispatchEvent(new Event('error')) // variant fails → original
    img.dispatchEvent(new Event('error')) // original fails → chain exhausted
    img.dispatchEvent(new Event('error')) // stale: must be ignored
    expect(onError).toHaveBeenCalledTimes(1)
    expect(img).toHaveAttribute('src', ORIGINAL)
  })

  it('a plain original (no variants) errors exactly once, then stops', () => {
    const onError = jest.fn()
    render(<OptimizedImage src={ORIGINAL} width={400} height={300} alt="" onError={onError} />)
    const img = screen.getByRole('img') as HTMLImageElement
    img.dispatchEvent(new Event('error'))
    img.dispatchEvent(new Event('error'))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(img).toHaveAttribute('src', ORIGINAL)
  })
})
