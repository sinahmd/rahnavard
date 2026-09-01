import Image, { ImageProps } from 'next/image'

/**
 * Resolves media URLs for local Docker development.
 *
 * In production, nginx proxies /media/* to the backend, so relative URLs work.
 * In local Docker dev, there's no nginx proxy, so media files must be fetched
 * directly from http://localhost:8000/media/...
 */
function resolveMediaSrc(src: string): string {
  if (typeof window === 'undefined') return src

  // Only resolve on localhost (local Docker dev)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return src
  }

  // Resolve relative /media/ URLs to the backend
  if (src.startsWith('/media/')) {
    return `http://localhost:8000${src}`
  }

  return src
}

export default function OptimizedImage(props: ImageProps) {
  const rawSrc = typeof props.src === 'string' ? props.src : ''
  const src = resolveMediaSrc(rawSrc)

  const isMediaUrl =
    src.startsWith('/media/') ||
    src.includes('rahnavard.co/media/') ||
    src.includes('localhost:8000/media/')

  return isMediaUrl ? (
    <Image {...props} src={src} alt={props.alt || ''} unoptimized />
  ) : (
    <Image {...props} src={src} alt={props.alt || ''} />
  )
}
