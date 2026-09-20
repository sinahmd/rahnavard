import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'
import type { SiteSettings } from '@/types/settings'

const settings = {
  site_name: 'رهنورد',
  address: 'تهران',
  phone: '۰۲۱۸۸۹۹۴۴۳۳',
} as unknown as SiteSettings

/**
 * Phase 9 / UX-5: visitor-facing phone numbers render Persian digits, while
 * the `tel:` href stays Latin (dialed digits must be ASCII).
 */
describe('Footer — Persian digit display layer', () => {
  it('renders the phone number in Persian digits', () => {
    render(<Footer settings={settings} />)
    expect(screen.getByText('۰۲۱۸۸۹۹۴۴۳۳')).toBeInTheDocument()
  })

  it('keeps the tel: href Latin', () => {
    render(<Footer settings={settings} />)
    expect(screen.getByRole('link', { name: '۰۲۱۸۸۹۹۴۴۳۳' })).toHaveAttribute(
      'href',
      'tel:02188994433'
    )
  })

  it('still renders Latin-digit phone data unchanged in Persian form', () => {
    const latin = { ...settings, phone: '021-8899 4433' } as SiteSettings
    render(<Footer settings={latin} />)
    expect(screen.getByText('۰۲۱-۸۸۹۹ ۴۴۳۳')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '۰۲۱-۸۸۹۹ ۴۴۳۳' })).toHaveAttribute(
      'href',
      'tel:021-8899 4433'
    )
  })
})
