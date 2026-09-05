/**
 * Shared public section heading (workstream H). Extracted from five real
 * copies across home sections, the related-cars slider, and the cars
 * loading state. `reveal-*` classes are the progressive-enhancement scroll
 * reveal (content is server-rendered regardless).
 */
interface SectionHeadProps {
  eyebrow?: string
  title: string
  description?: string
  reveal?: 'left' | 'right'
  headingLevel?: 'h1' | 'h2'
}

export default function SectionHead({
  eyebrow,
  title,
  description,
  reveal,
  headingLevel: Heading = 'h2',
}: SectionHeadProps) {
  return (
    <div className={`section-head${reveal ? ` reveal-${reveal}` : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Heading className="section-title">{title}</Heading>
      {description && <p>{description}</p>}
    </div>
  )
}
