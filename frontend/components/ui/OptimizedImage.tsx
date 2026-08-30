import Image, { ImageProps } from 'next/image'

export default function OptimizedImage(props: ImageProps) {
  const src = typeof props.src === 'string' ? props.src : ''

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
