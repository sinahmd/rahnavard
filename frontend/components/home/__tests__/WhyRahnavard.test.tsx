import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WhyRahnavard from '../WhyRahnavard'
import type { SiteSettings } from '@/types/settings'
import type { WhyFeature } from '@/types/feature'

const features: WhyFeature[] = [
  {
    id: 1,
    title: 'تضمین اصالت کالا',
    description: 'تمامی خودروها با گارانتی رسمی',
    icon: null,
    is_active: true,
    display_order: 0,
  },
]

const settings: SiteSettings = {
  site_name: 'راهنورد خودرو',
  site_description: '',
  logo: null,
  phone: '',
  address: '',
  instagram: '',
  telegram: '',
  whatsapp: '',
  hero_cta_primary_text: '',
  hero_cta_primary_link: '',
  hero_cta_secondary_text: '',
  hero_cta_secondary_link: '',
  why_title: 'چرا راهنورد خودرو؟',
  why_description: 'شفافیت و اطمینان در خرید.',
  why_background: null,
  why_background_variants: null,
  cars_section_title: '',
  cars_section_description: '',
  articles_section_title: '',
  articles_section_description: '',
  branches_section_title: '',
  form_title: '',
  form_description: '',
  footer_description: '',
  footer_copyright: '',
  default_og_image: null,
}

const backgroundVariants = {
  webp: '/media/why/.variants/bg/bg.webp',
  sm: '/media/why/.variants/bg/sm.webp',
  md: '/media/why/.variants/bg/md.webp',
  lg: '/media/why/.variants/bg/lg.webp',
  lqip: '/media/why/.variants/bg/lqip.webp',
  blur: 'data:image/webp;base64,UklGRhIA',
}

const sixFeatures: WhyFeature[] = [
  { id: 1, title: 'یکی', description: 'd', icon: null, is_active: true, display_order: 0 },
  { id: 2, title: 'دو', description: 'd', icon: null, is_active: true, display_order: 1 },
  { id: 3, title: 'سه', description: 'd', icon: null, is_active: true, display_order: 2 },
  { id: 4, title: 'چهار', description: 'd', icon: null, is_active: true, display_order: 3 },
  { id: 5, title: 'پنج', description: 'd', icon: null, is_active: true, display_order: 4 },
  { id: 6, title: 'شش', description: 'd', icon: null, is_active: true, display_order: 5 },
]

/**
 * The managed background is decorative: the fallback SVG must survive until
 * an admin uploads an image, and the image path must never disturb the
 * section's existing title/description/features content.
 */
describe('WhyRahnavard background (managed image)', () => {
  it('renders the SVG fallback when no background is configured', () => {
    const { container } = render(<WhyRahnavard features={features} settings={settings} />)

    expect(container.querySelector('.opacity-5')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('چرا راهنورد خودرو؟')).toBeInTheDocument()
  })

  it('renders the managed background instead of the SVG when configured', () => {
    const { container } = render(
      <WhyRahnavard
        features={features}
        settings={{
          ...settings,
          why_background: '/media/why/bg.jpg',
          why_background_variants: backgroundVariants,
        }}
      />
    )

    // The fill slot derives the lg tier; LQIP arrives as the blur placeholder.
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/media/why/.variants/bg/lg.webp')
    expect(img).toHaveAttribute('alt', '') // decorative — never announced
    expect(img).toHaveAttribute('blurdataurl', backgroundVariants.blur)
    expect(container.querySelector('.opacity-5')).not.toBeInTheDocument()
  })

  it('degrades to the original URL when the variant set is missing', () => {
    const { container } = render(
      <WhyRahnavard
        features={features}
        settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
      />
    )

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/why/bg.jpg')
  })

  it('keeps title, description and features alongside the background', () => {
    render(
      <WhyRahnavard
        features={features}
        settings={{
          ...settings,
          why_background: '/media/why/bg.jpg',
          why_background_variants: backgroundVariants,
        }}
      />
    )

    expect(screen.getByText('چرا راهنورد خودرو؟')).toBeInTheDocument()
    expect(screen.getByText('شفافیت و اطمینان در خرید.')).toBeInTheDocument()
    expect(screen.getByText('تضمین اصالت کالا')).toBeInTheDocument()
    expect(screen.getByText('تمامی خودروها با گارانتی رسمی')).toBeInTheDocument()
  })

  /**
   * Visual contract pinned to the approved artwork
   * (assets/why-rahnavard-bg/why-rahnavard-bg-with-text.png): center header
   * column (kicker + large bold title + small gray description), features
   * split into two flanking columns (01–03 / 04–06), NO default icon,
   * amber indices + amber rules, light wash only.
   */
  describe('artwork-matched typography (background mode)', () => {
    it('renders the Latin kicker above the title', () => {
      render(
        <WhyRahnavard
          features={features}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      expect(screen.getByText('Why Rahnavard')).toBeInTheDocument()
    })

    it('title is large and bold, centered in the middle column', () => {
      render(
        <WhyRahnavard
          features={features}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      const title = screen.getByText('چرا راهنورد خودرو؟')
      expect(title.tagName).toBe('H2')
      expect(title.className).toContain('font-bold')
      expect(title.className).toContain('md:text-[48px]')
      expect(title.className).not.toContain('font-black')
    })

    it('features split into first-half / second-half flanking columns', () => {
      const { container } = render(
        <WhyRahnavard
          features={sixFeatures}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      const firstColumn = container.querySelector('[class*="md:col-start-1"]')
      const thirdColumn = container.querySelector('[class*="md:col-start-3"]')
      expect(firstColumn).toBeInTheDocument()
      expect(thirdColumn).toBeInTheDocument()
      // First half 01–03 in the first (visual right) column…
      expect(firstColumn).toHaveTextContent('01')
      expect(firstColumn).toHaveTextContent('03')
      expect(firstColumn?.textContent).not.toContain('04')
      // …second half 04–06 in the third (visual left) column.
      expect(thirdColumn).toHaveTextContent('04')
      expect(thirdColumn).toHaveTextContent('06')
      expect(thirdColumn?.textContent).not.toContain('01')
    })

    it('features are pure typography — no default icon, only uploaded ones', () => {
      const { container } = render(
        <WhyRahnavard
          features={features}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      // The fixture feature has no uploaded icon → no img inside the feature.
      const featureRoot = container.querySelector('.why-feature')
      expect(featureRoot).toBeInTheDocument()
      expect(featureRoot?.querySelector('img')).toBeNull()
      // Contract pieces in order: amber index, bold title, description on a
      // frosted plate, amber rule.
      expect(featureRoot?.querySelector('[aria-hidden="true"]')).toHaveTextContent('01')
      expect(featureRoot?.querySelector('h3')).toHaveClass('font-bold')
      const description = featureRoot?.querySelector('p')
      expect(description).toHaveClass('bg-white/10')
      expect(description).toHaveClass('backdrop-blur-sm')
      expect(featureRoot?.querySelector('.bg-accent')).toBeInTheDocument()
    })

    it('an uploaded icon renders small beside the title', () => {
      const withIcon: WhyFeature[] = [{ ...features[0], icon: '/media/why/icon.png' }]
      const { container } = render(
        <WhyRahnavard
          features={withIcon}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      const icon = container.querySelector('.why-feature img')
      expect(icon).toHaveAttribute('src', '/media/why/icon.png')
      expect(icon).toHaveAttribute('alt', '') // decorative, title carries the meaning
    })

    it('wash stays light (nearly nil on mobile, slightly stronger on desktop where text overlays the crop)', () => {
      const { container } = render(
        <WhyRahnavard
          features={features}
          settings={{
            ...settings,
            why_background: '/media/why/bg.jpg',
            why_background_variants: backgroundVariants,
          }}
        />
      )

      const wash = container.querySelector('[class*="bg-white/30"]')
      expect(wash).toBeInTheDocument()
      expect(wash?.className).toContain('md:bg-white/25')
    })

    it('background is one full-bleed cover layer on every breakpoint', () => {
      const { container } = render(
        <WhyRahnavard
          features={features}
          settings={{
            ...settings,
            why_background: '/media/why/bg.jpg',
            why_background_variants: backgroundVariants,
          }}
        />
      )

      const bgLayer = container.querySelector('[class*="absolute"][class*="inset-0"]')
      expect(bgLayer?.className).toContain('pointer-events-none')
      // No band / no blurred continuation — exactly one image layer.
      expect(container.querySelector('[class*="aspect-video"]')).not.toBeInTheDocument()
      expect(container.querySelector('[class*="blur-2xl"]')).not.toBeInTheDocument()
      const img = bgLayer?.querySelector('img')
      expect(img).toHaveAttribute('src', '/media/why/.variants/bg/lg.webp')
      expect(img?.className).toContain('object-cover')
    })

    it('content stacks header-first on mobile (kicker before any feature)', () => {
      const { container } = render(
        <WhyRahnavard
          features={sixFeatures}
          settings={{ ...settings, why_background: '/media/why/bg.jpg' }}
        />
      )

      // Header is the first element of the grid; feature columns follow.
      const grid = container.querySelector('[data-testid="why-grid"]')
      const header = grid?.firstElementChild
      expect(header).toBeInTheDocument()
      expect(header).toHaveTextContent('Why Rahnavard')
      const firstColumn = container.querySelector('[class*="md:col-start-1"]')
      expect(firstColumn).not.toBeNull()
      expect(header!.compareDocumentPosition(firstColumn!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it('SVG fallback keeps the full artwork typography over the plain background', () => {
    const { container } = render(<WhyRahnavard features={features} settings={settings} />)

    expect(container.querySelector('.opacity-5')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('Why Rahnavard')).toBeInTheDocument()
    expect(screen.getByText('چرا راهنورد خودرو؟')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('01')
  })
})
