/**
 * Phase 3: the root layout is now a minimal server shell — html/body/fonts
 * only. Providers are scoped by route group: AuthProvider lives in
 * app/admin/layout.tsx, and site settings are server-fetched in
 * app/(site)/layout.tsx. Therefore rendering the root layout must produce
 * zero network calls (no /auth/session/, no /api/v1/settings/).
 *
 * RootLayout emits <html>/<body>, so it is rendered into a full jsdom
 * Document (createRoot) rather than testing-library's <div> container.
 */
import { act } from '@testing-library/react'
import { createRoot, type Root } from 'react-dom/client'
import RootLayout from '../layout'

// app/layout.tsx imports './globals.css'; jest has no CSS pipeline.
jest.mock('../globals.css', () => ({}))

const mockFetch = jest.fn()

function renderIntoDocument(ui: React.ReactElement): { doc: Document; root: Root } {
  const doc = document.implementation.createHTMLDocument('public-page-test')
  let root!: Root
  act(() => {
    root = createRoot(doc)
    root.render(ui)
  })
  return { doc, root }
}

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch
})

describe('RootLayout (public pages)', () => {
  it('renders children without making any network calls', async () => {
    const { doc, root } = renderIntoDocument(
      <RootLayout>
        <div>public content</div>
      </RootLayout>
    )
    await act(async () => {})

    expect(doc.body?.textContent).toContain('public content')
    expect(mockFetch).not.toHaveBeenCalled()

    act(() => root.unmount())
  })
})