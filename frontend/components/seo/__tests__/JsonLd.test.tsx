import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import JsonLd from '../JsonLd'

describe('JsonLd', () => {
  it('should render script tag with application/ld+json type', () => {
    const data = { '@type': 'Organization', name: 'Test' }
    const { container } = render(<JsonLd data={data} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
  })

  it('should serialize data as JSON in the script content', () => {
    const data = { '@type': 'Organization', name: 'Rahnavard' }
    const { container } = render(<JsonLd data={data} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).toBe(JSON.stringify(data))
  })

  it('should handle nested objects', () => {
    const data = {
      '@type': 'Product',
      name: 'Car',
      offers: { price: '100000', priceCurrency: 'IRR' },
    }
    const { container } = render(<JsonLd data={data} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).toContain('"offers"')
    expect(script?.innerHTML).toContain('"100000"')
  })

  it('should handle empty object', () => {
    const { container } = render(<JsonLd data={{}} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).toBe('{}')
  })

  it('should handle array data', () => {
    const data = { '@graph': [{ '@type': 'WebPage' }, { '@type': 'Article' }] }
    const { container } = render(<JsonLd data={data} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).toContain('@graph')
    expect(script?.innerHTML).toContain('WebPage')
  })
})
