/**
 * /articles server shell tests.
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import ArticlesPage from '../articles/page'
import { getArticlesPage } from '@/lib/data/article'
import { parseArticleListQuery } from '@/lib/data/listQuery'

jest.mock('@/lib/data/article', () => ({
  getArticlesPage: jest.fn(),
}))

const mockGetArticlesPage = getArticlesPage as jest.MockedFunction<typeof getArticlesPage>

const articleItem = {
  id: 1,
  title: 'راهنمای خرید خودرو',
  slug: 'car-buying-guide',
  excerpt: 'نکات مهم هنگام خرید',
  cover_image: null,
  published_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetArticlesPage.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    page_size: 20,
    results: [articleItem as never],
  })
})

describe('/articles server shell', () => {
  it('parses searchParams and fetches the matching first page', async () => {
    const element = await ArticlesPage({ searchParams: { search: 'هیوندای', page: '2' } })

    expect(mockGetArticlesPage).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'هیوندای', page: 2 })
    )
    expect(element).toBeTruthy()
  })

  it('clamps invalid params and passes the parsed query to the island', async () => {
    const element = await ArticlesPage({ searchParams: { page: '-3' } })

    expect(mockGetArticlesPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: '' })
    )
    const expectedQuery = parseArticleListQuery(new URLSearchParams('page=-3'))
    render(element)
    expect(screen.getByText('راهنمای خرید خودرو')).toBeInTheDocument()
    expect(mockGetArticlesPage).toHaveBeenCalledWith(expectedQuery)
  })
})