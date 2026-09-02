import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// Timeout for fetch during build (prevents hanging if API is unreachable)
const FETCH_TIMEOUT = 5000

// Build absolute API URL for server-side fetching
function getAbsoluteApiUrl(path: string): string {
  if (API_URL.startsWith('http')) return `${API_URL}${path}`
  return `${BASE_URL}${API_URL}${path}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/cars`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]

  // Dynamic car pages
  let carPages: MetadataRoute.Sitemap = []
  try {
    const response = await fetch(getAbsoluteApiUrl('/cars/'), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (response.ok) {
      const carsData = await response.json()
      const cars = carsData.results || []
      carPages = cars.map((car: any) => ({
        url: `${BASE_URL}/cars/${car.slug}`,
        lastModified: car.updated_at ? new Date(car.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch {
  }

  // Dynamic article pages
  let articlePages: MetadataRoute.Sitemap = []
  try {
    const response = await fetch(getAbsoluteApiUrl('/articles/'), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (response.ok) {
      const articlesData = await response.json()
      const articles = articlesData.results || []
      articlePages = articles.map((article: any) => ({
        url: `${BASE_URL}/articles/${article.slug}`,
        lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    }
  } catch {
  }

  return [...staticPages, ...carPages, ...articlePages]
}
