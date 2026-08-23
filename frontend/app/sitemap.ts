import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

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
      next: { revalidate: 3600 }, // Revalidate every hour
    })
    if (response.ok) {
      const cars = await response.json()
      carPages = cars.map((car: any) => ({
        url: `${BASE_URL}/cars/${car.slug}`,
        lastModified: new Date(car.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error('Error fetching cars for sitemap:', error)
  }

  // Dynamic article pages
  let articlePages: MetadataRoute.Sitemap = []
  try {
    const response = await fetch(getAbsoluteApiUrl('/articles/'), {
      next: { revalidate: 3600 },
    })
    if (response.ok) {
      const articles = await response.json()
      articlePages = articles.map((article: any) => ({
        url: `${BASE_URL}/articles/${article.slug}`,
        lastModified: new Date(article.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error)
  }

  return [...staticPages, ...carPages, ...articlePages]
}
