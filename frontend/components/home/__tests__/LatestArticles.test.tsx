import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import LatestArticles from '../LatestArticles'

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: jest.fn(() => ({
    articles_section_title: 'مقاله و اطلاعیه',
    articles_section_description: 'آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.',
  })),
}))

jest.mock('@/lib/apiUrl', () => ({
  apiUrl: (path: string) => `http://localhost:8000${path}`,
}))


const mockFetch = jest.fn()
global.fetch = mockFetch

const mockArticles = [
  {
    id: 1,
    title: 'راهنمای خرید خودرو',
    slug: 'car-buying-guide',
    excerpt: 'نکات مهم هنگام خرید خودرو',
    published_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    title: 'مقایسه هیوندای و کیا',
    slug: 'hyundai-vs-kia',
    excerpt: 'مقایسه دو برند محبوب',
    published_at: '2025-01-10T10:00:00Z',
  },
]

describe('LatestArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<LatestArticles />)
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()
  })

  it('should render articles after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockArticles }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    })

    expect(screen.getByText('مقایسه هیوندای و کیا')).toBeInTheDocument()
  })

  it('should render article excerpts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockArticles }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('نکات مهم هنگام خرید خودرو')).toBeInTheDocument()
    })

    expect(screen.getByText('مقایسه دو برند محبوب')).toBeInTheDocument()
  })

  it('should render article links with correct href', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockArticles }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    })

    const links = screen.getAllByText('مطالعه بیشتر')
    expect(links[0].closest('a')).toHaveAttribute('href', '/articles/car-buying-guide')
    expect(links[1].closest('a')).toHaveAttribute('href', '/articles/hyundai-vs-kia')
  })

  it('should show empty state when no articles', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText(/مقاله‌ای یافت نشد/)).toBeInTheDocument()
    })
  })

  it('should limit articles to 3', async () => {
    const manyArticles = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      title: `مقاله ${i + 1}`,
      slug: `article-${i + 1}`,
      excerpt: `توضیح ${i + 1}`,
      published_at: '2025-01-15T10:00:00Z',
    }))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: manyArticles }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('مقاله 1')).toBeInTheDocument()
    })

    // Should only render 3 articles
    const links = screen.getAllByText('مطالعه بیشتر')
    expect(links).toHaveLength(3)
  })

  it('should use custom section title from settings', async () => {
    const { useSettings } = require('@/contexts/SettingsContext')
    useSettings.mockReturnValueOnce({
      articles_section_title: 'اخبار جدید',
      articles_section_description: 'توضیحات سفارشی',
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('اخبار جدید')).toBeInTheDocument()
    })
  })

  it('should use default section title when settings unavailable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('مقاله و اطلاعیه')).toBeInTheDocument()
    })
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.queryByText('در حال بارگذاری...')).not.toBeInTheDocument()
    })
  })

  it('should handle articles without results wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles, // Direct array
    })

    render(<LatestArticles />)

    await waitFor(() => {
      expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    })
  })
})
