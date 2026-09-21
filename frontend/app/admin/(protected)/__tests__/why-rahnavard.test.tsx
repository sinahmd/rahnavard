import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WhyRahnavardAdminPage from '../why-rahnavard/page'
import { getSiteSettings, updateSiteSettings } from '@/lib/api/settings'
import { listFeatures } from '@/lib/api/features'
import type { Paginated } from '@/types/api'
import type { SiteSettings } from '@/types/settings'
import type { WhyFeature } from '@/types/feature'

jest.mock('@/lib/api/settings', () => ({
  getSiteSettings: jest.fn(),
  updateSiteSettings: jest.fn(),
}))
jest.mock('@/lib/api/features', () => ({
  listFeatures: jest.fn(),
  setFeatureActive: jest.fn(),
  deleteFeature: jest.fn(),
}))

const mockGetSiteSettings = getSiteSettings as jest.MockedFunction<typeof getSiteSettings>
const mockUpdateSiteSettings = updateSiteSettings as jest.MockedFunction<typeof updateSiteSettings>
const mockListFeatures = listFeatures as jest.MockedFunction<typeof listFeatures>

const settingsResponse = {
  site_name: 'راهنورد خودرو',
  why_title: 'چرا راهنورد خودرو؟',
  why_description: 'شفافیت در خرید',
  why_background: '/media/why/bg.jpg',
  why_background_variants: null,
} as unknown as SiteSettings

const feature: WhyFeature = {
  id: 7,
  title: 'تضمین اصالت کالا',
  description: 'تمامی خودروها با گارانتی رسمی',
  icon: null,
  is_active: true,
  display_order: 0,
}

function featurePage(): Paginated<WhyFeature> {
  return { count: 1, next: null, previous: null, results: [feature] }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSiteSettings.mockResolvedValue(settingsResponse)
  mockListFeatures.mockResolvedValue(featurePage())
})

/**
 * The tab groups two existing endpoints (settings PATCH + features CRUD) in
 * one UI — these tests pin the grouping, the partial-PATCH scope, and the
 * background upload without touching the backend contract.
 */
describe('Why Rahnavard admin tab', () => {
  it('renders the section fields prefilled and embeds the feature list', async () => {
    render(<WhyRahnavardAdminPage />)

    expect(await screen.findByDisplayValue('چرا راهنورد خودرو؟')).toBeInTheDocument()
    expect(screen.getByDisplayValue('شفافیت در خرید')).toBeInTheDocument()
    // Background preview comes from the stored URL.
    expect(screen.getByAltText('تصویر پس‌زمینه')).toHaveAttribute('src', '/media/why/bg.jpg')
    // The features list renders inside the same tab.
    await waitFor(() => expect(screen.getAllByText('تضمین اصالت کالا').length).toBeGreaterThan(0))
  })

  it('saves a partial PATCH carrying only the why fields', async () => {
    mockUpdateSiteSettings.mockResolvedValue(settingsResponse)
    render(<WhyRahnavardAdminPage />)
    await screen.findByDisplayValue('چرا راهنورد خودرو؟')

    fireEvent.click(screen.getByRole('button', { name: 'ذخیره بخش' }))

    await waitFor(() => expect(mockUpdateSiteSettings).toHaveBeenCalledTimes(1))
    const formData = mockUpdateSiteSettings.mock.calls[0][0]
    expect(Array.from(formData.keys())).toEqual(['why_title', 'why_description'])
    expect(formData.get('why_title')).toBe('چرا راهنورد خودرو؟')
  })

  it('appends the chosen background file to the PATCH', async () => {
    mockUpdateSiteSettings.mockResolvedValue(settingsResponse)
    const { container } = render(<WhyRahnavardAdminPage />)
    await screen.findByDisplayValue('چرا راهنورد خودرو؟')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['png'], 'bg.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: 'ذخیره بخش' }))

    await waitFor(() => expect(mockUpdateSiteSettings).toHaveBeenCalledTimes(1))
    const formData = mockUpdateSiteSettings.mock.calls[0][0]
    expect(formData.get('why_background')).toBe(file)
  })
})
