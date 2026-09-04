import { Metadata } from 'next'
import OptimizedImage from '@/components/ui/OptimizedImage'
import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import type { ArticleDetail } from '@/types/article'
import { normalizeMediaUrls } from '@/lib/data/media'

type Props = {
  params: { slug: string }
}

async function getArticle(slug: string): Promise<ArticleDetail | null> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/articles/${slug}/`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const data = await res.json()
      // Strip the internal backend origin from media URLs so client
      // components get same-origin relative paths (see lib/data/media.ts).
      normalizeMediaUrls(data, ['cover_image', 'og_image'])
      return data
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.slug)

  if (!article) {
    return {
      title: 'مقاله یافت نشد | راهنورد خودرو',
    }
  }

  const title = article.seo_title || `${article.title} | راهنورد خودرو`
  const description = article.seo_description || article.excerpt || article.title

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahnavard.co'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.published_at || undefined,
      images: article.og_image
        ? [{ url: article.og_image.startsWith('http') ? article.og_image : `${siteUrl}${article.og_image}`, width: 800, height: 400, alt: article.title }]
        : article.cover_image
          ? [{ url: article.cover_image.startsWith('http') ? article.cover_image : `${siteUrl}${article.cover_image}`, width: 800, height: 400, alt: article.title }]
          : [],
    },
  }
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('fa-IR')
  } catch {
    return ''
  }
}

export default async function ArticleDetailPage({ params }: Props) {
  const article = await getArticle(params.slug)

  if (!article) {
    return (
      <main className="pt-32 pb-20">
        <div className="wrap text-center">
          <h1 className="text-3xl font-bold mb-4">مقاله یافت نشد</h1>
          <p className="text-gray mb-8">متأسفانه مقاله مورد نظر شما یافت نشد.</p>
          <Link href="/articles" className="btn btn-primary">
            بازگشت به لیست مقالات
          </Link>
        </div>
      </main>
    )
  }

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt || article.title,
          datePublished: article.published_at,
          image: article.cover_image || article.og_image || undefined,
          author: {
            '@type': 'Organization',
            name: 'راهنورد خودرو',
          },
          publisher: {
            '@type': 'Organization',
            name: 'راهنورد خودرو',
          },
        }}
      />
      <main className="pt-32 pb-20">
        <div className="wrap max-w-[800px] mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-gray">
              <li>
                <Link href="/" className="hover:text-accent-dark transition-colors">
                  خانه
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/articles" className="hover:text-accent-dark transition-colors">
                  مقالات
                </Link>
              </li>
              <li>/</li>
              <li className="text-dark font-medium">{article.title}</li>
            </ol>
          </nav>

          {/* Cover Image */}
          {article.cover_image && (
            <div className="mb-8 rounded-[14px] overflow-hidden">
              <OptimizedImage
                src={article.cover_image}
                alt={article.title}
                width={800}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8">
            {article.published_at && (
              <span className="text-sm text-accent-dark font-bold mb-3 block">
                {formatDate(article.published_at)}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-gray text-lg">
                {article.excerpt}
              </p>
            )}
          </header>

          {/* Article Content */}
          <article
            className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-dark prose-p:text-gray prose-p:leading-relaxed prose-li:text-gray prose-a:text-accent-dark hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-gray-light">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-accent-dark font-bold hover:underline"
            >
              <svg
                className="w-4 h-4 rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
              بازگشت به لیست مقالات
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
