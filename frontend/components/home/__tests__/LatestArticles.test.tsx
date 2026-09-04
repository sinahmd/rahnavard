import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import LatestArticles from '../LatestArticles'
import type { SiteSettings } from '@/types/settings'
import type { ArticleListItem } from '@/types/article'

const settings = {
  articles_section_title: 'مقاله و اطلاعیه',
  articles_section_description: 'آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.',
} as SiteSettings

const mockFetch = jest.fn()

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
] as unknown as ArticleListItem[]

describe('LatestArticles (client island)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch
  })

  it('renders articles passed as props without fetching on mount', () => {
    render(<LatestArticles articles={mockArticles} settings={settings} />)

    expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    expect(screen.getByText('مقایسه هیوندای و کیا')).toBeInTheDocument()
    expect(screen.getByText('نکات مهم هنگام خرید خودرو')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('renders article links with correct href', () => {
    render(<LatestArticles articles={mockArticles} settings={settings} />)

    const links = screen.getAllByText('مطالعه بیشتر')
    expect(links[0].closest('a')).toHaveAttribute('href', '/articles/car-buying-guide')
    expect(links[1].closest('a')).toHaveAttribute('href', '/articles/hyundai-vs-kia')
  })

  it('shows the empty state when no articles', () => {
    render(<LatestArticles articles={[]} settings={settings} />)
    expect(screen.getByText(/مقاله‌ای یافت نشد/)).toBeInTheDocument()
  })

  it('uses the section title from the settings prop', () => {
    render(
      <LatestArticles
        articles={[]}
        settings={
          {
            articles_section_title: 'اخبار جدید',
            articles_section_description: 'توضیحات سفارشی',
          } as SiteSettings
        }
      />
    )
    expect(screen.getByText('اخبار جدید')).toBeInTheDocument()
  })

  it('renders the article date in Persian locale', () => {
    render(<LatestArticles articles={mockArticles} settings={settings} />)
    expect(screen.getAllByText(/۱۴۰۳/)).toHaveLength(2)
  })
})