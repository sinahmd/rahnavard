/**
 * Phase 2 regression fix: AuthProvider moved out of the root layout into
 * app/admin/layout.tsx. Public pages must therefore never call
 * /api/v1/auth/session/ and anonymous visitors must never be redirected to
 * /admin/login (the 401 policy in http.ts only applies to admin requests).
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
const assignMock = jest.fn()

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
  assignMock.mockClear()
  Object.defineProperty(window, 'location', {
    value: { pathname: '/', assign: assignMock },
    configurable: true,
    writable: true,
  })
})

describe('RootLayout (public pages)', () => {
  it('renders children without ever calling the auth session endpoint', async () => {
    // SettingsProvider fetches /api/v1/settings/ on mount; answer it.
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ site_name: 'راهنورد' }),
    })

    const { doc, root } = renderIntoDocument(
      <RootLayout>
        <div>public content</div>
      </RootLayout>
    )
    await act(async () => {
      // flush SettingsProvider's fetch-then-setState chain
    })
    await act(async () => {})

    expect(doc.body?.textContent).toContain('public content')
    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.includes('/auth/session/'))).toBe(false)

    act(() => root.unmount())
  })

  it('never redirects anonymous visitors to /admin/login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const { root } = renderIntoDocument(
      <RootLayout>
        <div>public content</div>
      </RootLayout>
    )
    await act(async () => {})
    await act(async () => {})

    expect(assignMock).not.toHaveBeenCalled()

    act(() => root.unmount())
  })
})
