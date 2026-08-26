import Image, { ImageProps } from 'next/image'

/**
 * OptimizedImage — wraps next/image but marks /media/ URLs as unoptimized.
 *
 * Why? Our media files are served by nginx directly from a Docker volume.
 * The default next/image optimization tries to re-fetch images from the
 * public origin, which breaks inside Docker because the _next/image proxy
 * can't reliably round-trip through Arvan Cloud to reach nginx.
 *
 * Since nginx already serves files efficiently with caching headers,
 * we skip the extra optimization hop for /media/ paths.
 */
export default function OptimizedImage(props: ImageProps) {
  let src = typeof props.src === 'string' ? props.src : ''

  // Transform Docker-internal backend URLs to public URLs
  if (src.startsWith('http://backend:8000/media/')) {
    src = src.replace('http://backend:8000', '')
  }

  const isMediaUrl =
    src.startsWith('/media/') ||
    src.includes('rahnavard.co/media/')

  // Only pass unoptimized when true to avoid React DOM warning for false
  return isMediaUrl ? <Image {...props} src={src} unoptimized /> : <Image {...props} src={src} />
}
