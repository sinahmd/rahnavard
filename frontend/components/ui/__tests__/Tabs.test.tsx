import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import Tabs from '../Tabs'

describe('Tabs', () => {
  it('renders the default active tab and its panel', () => {
    render(
      <Tabs labels={['اول', 'دوم']} defaultIndex={0}>
        <div>پنل اول</div>
        <div>پنل دوم</div>
      </Tabs>
    )

    expect(screen.getByText('پنل اول')).toBeInTheDocument()
    expect(screen.queryByText('پنل دوم')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'اول' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('switches panels when another tab is clicked', () => {
    render(
      <Tabs labels={['اول', 'دوم']} defaultIndex={0}>
        <div>پنل اول</div>
        <div>پنل دوم</div>
      </Tabs>
    )

    fireEvent.click(screen.getByRole('tab', { name: 'دوم' }))

    expect(screen.getByText('پنل دوم')).toBeInTheDocument()
    expect(screen.queryByText('پنل اول')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'دوم' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})

