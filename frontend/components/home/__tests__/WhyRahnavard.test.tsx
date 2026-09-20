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
})
