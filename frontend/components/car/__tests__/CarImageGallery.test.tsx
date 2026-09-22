import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import CarImageGallery from '../CarImageGallery'
import type { ImageVariants } from '@/types/media'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, fill, priority, blurDataURL, ...props }: Record<string, unknown>) => {
    // The project's jest.setup.js global mock already strips Next-specific
    // props; this local mock mirrors it so `src` stays assertable as a DOM
    // attribute while the variant-fallback handler runs for real.
    void unoptimized
    void fill
    void priority
    void blurDataURL
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

const ORIGINAL = '/media/cars/cutout.png'
const GALLERY = ['/media/cars/9/gallery/1bf68c3f.webp']

const MAIN_VARIANTS: ImageVariants = {
  webp: '/media/cars/.variants/cutout/webp.webp',
  sm: '/media/cars/.variants/cutout/sm.webp',
  md: '/media/cars/.variants/cutout/md.webp',
  lg: '/media/cars/.variants/cutout/lg.webp',
  lqip: '/media/cars/.variants/cutout/lqip.webp',
  blur: 'data:image/webp;base64,UklGRg==',
}

const GALLERY_VARIANTS: ImageVariants = {
  webp: '/media/cars/9/gallery/.variants/1bf68c3f/webp.webp',
  sm: '/media/cars/9/gallery/.variants/1bf68c3f/sm.webp',
  md: '/media/cars/9/gallery/.variants/1bf68c3f/md.webp',
  lg: '/media/cars/9/gallery/.variants/1bf68c3f/lg.webp',
  lqip: '/media/cars/9/gallery/.variants/1bf68c3f/lqip.webp',
  blur: 'data:image/webp;base64,UklGRg==',
}

describe('CarImageGallery — thumbnails', () => {
  it('renders one labeled thumbnail per image, loading the sm tier first', () => {
    render(
      <CarImageGallery
        mainImage={ORIGINAL}
        gallery={GALLERY}
        persianName="هیوندا ساناتا"
        mainImageVariants={MAIN_VARIANTS}
        galleryVariants={[GALLERY_VARIANTS]}
      />
    )

    const thumbs = screen.getAllByRole('button', { name: /تصویر/ })
    // 2 main-viewer prev/next buttons + 2 thumbnail buttons — filter to the
    // numbered ones by aria-label shape.
    const numbered = screen.getAllByRole('button', { name: /^تصویر \d+$/ })
    expect(numbered).toHaveLength(2)
    expect(thumbs.length).toBeGreaterThanOrEqual(numbered.length)

    const imgs = screen.getAllByRole('img') as HTMLImageElement[]
    const thumbSrcs = imgs.map((img) => img.getAttribute('src'))
    expect(thumbSrcs).toContain(MAIN_VARIANTS.sm)
    expect(thumbSrcs).toContain(GALLERY_VARIANTS.sm)
  })

  it('advances a broken variant thumbnail to the original URL on error', () => {
    render(
      <CarImageGallery
        mainImage={ORIGINAL}
        gallery={GALLERY}
        persianName="هیوندا ساناتا"
        mainImageVariants={MAIN_VARIANTS}
        galleryVariants={[GALLERY_VARIANTS]}
      />
    )

    const galleryThumb = screen
      .getAllByRole('img')
      .find((img) => img.getAttribute('src') === GALLERY_VARIANTS.sm) as HTMLImageElement
    expect(galleryThumb).toBeDefined()

    galleryThumb.dispatchEvent(new Event('error'))
    expect(galleryThumb).toHaveAttribute('src', GALLERY[0])
  })

  it('uses the original URL directly when the API has no variants for a slide', () => {
    render(
      <CarImageGallery mainImage={ORIGINAL} gallery={GALLERY} persianName="هیوندا ساناتا" />
    )

    const galleryThumb = screen
      .getAllByRole('img')
      .find((img) => img.getAttribute('src') === GALLERY[0]) as HTMLImageElement
    expect(galleryThumb).toBeDefined()
  })

  it('selecting a thumbnail switches the main viewer image', () => {
    render(
      <CarImageGallery
        mainImage={ORIGINAL}
        gallery={GALLERY}
        persianName="هیوندا ساناتا"
        mainImageVariants={MAIN_VARIANTS}
        galleryVariants={[GALLERY_VARIANTS]}
      />
    )

    const counter = screen.getByText('1 / 2')
    fireEvent.click(screen.getByRole('button', { name: 'تصویر 2' }))
    expect(counter).toHaveTextContent('2 / 2')
  })
})
