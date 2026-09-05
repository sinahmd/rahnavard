import OptimizedImage from '@/components/ui/OptimizedImage'

/**
 * The card image block shared by CarCard, the home FeaturedCars card, and
 * the RelatedCarsSlider card (workstream H) — the one piece of car-card
 * markup that is identical in all three. Wrapper/image class extensions
 * preserve each card's own spacing and hover treatment.
 */
interface CarCardImageProps {
  src: string | null
  alt: string
  className?: string
  imageClassName?: string
  placeholderClassName?: string
}

export default function CarCardImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  placeholderClassName = '',
}: CarCardImageProps) {
  return (
    <div className={`w-full aspect-[4/3] flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={400}
          height={300}
          className={`max-w-[88%] max-h-full object-contain ${imageClassName}`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full bg-gray-light flex items-center justify-center text-gray ${placeholderClassName}`}
        >
          بدون تصویر
        </div>
      )}
    </div>
  )
}
