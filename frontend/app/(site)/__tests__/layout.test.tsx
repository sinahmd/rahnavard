/**
 * Public (site) layout tests — the keyboard-visible skip link (plan §6.I).
 * The layout is an async server component, so it is executed directly (the
 * house pattern from the /cars shell test) with `getSiteSettings` mocked;
 * the client Header/Footer chrome renders around the page content.
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SiteLayout from '../layout'
import { getSiteSettings } from '@/lib/data/settings'
import type { SiteSettings } from '@/types/settings'

jest.mock('@/lib/data/settings', () => ({
  getSiteSettings: jest.fn(),
}))

const mockGetSiteSettings = getSiteSettings as jest.MockedFunction<typeof getSiteSettings>

const settings = {
  site_name: 'راهنورد خودرو',
  site_description: '',
  logo: null,
  phone: '09110000000',
  address: 'ساری',
  instagram: '',
  telegram: '',
  whatsapp: '',
  hero_cta_primary_text: '',
  hero_cta_primary_link: '',
  hero_cta_secondary_text: '',
  hero_cta_secondary_link: '',
  why_title: '',
  why_description: '',
  cars_section_title: '',
  cars_section_description: '',
  articles_section_title: '',
  articles_section_description: '',
  branches_section_title: '',
  form_title: '',
  form_description: '',
  footer_description: 'توضیح فوتر',
  footer_copyright: '© راهنورد',
  default_og_image: null,
} as SiteSettings

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSiteSettings.mockResolvedValue(settings)
})

describe('(site) layout — skip link', () => {
  it('renders a keyboard-visible skip link as the first focusable element', async () => {
    const element = await SiteLayout({ children: <div id="main-content">محتوای صفحه</div> })
    const { container } = render(element)

    const skipLink = screen.getByRole('link', { name: 'پرش به محتوا' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(skipLink).toHaveClass('skip-link')

    // First focusable element in the document, before the header.
    const focusable = container.querySelector('a, button, [href], input, select, textarea')
    expect(focusable).toBe(skipLink)

    // It targets the page-level main landmark (children carry the id).
    expect(screen.getByText('محتوای صفحه')).toBeInTheDocument()
    expect(mockGetSiteSettings).toHaveBeenCalledTimes(1)
  })
})