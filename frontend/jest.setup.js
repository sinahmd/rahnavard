// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    basePath: '',
    isReady: true,
    isPreview: false,
    pathname: '/',
    asPath: '/',
    query: {},
    route: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}))

// Mock next/image
// Strip Next.js-specific props that are not valid DOM attributes so the
// mock never emits React warnings like "Received `true` for a non-boolean
// attribute `unoptimized`".
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, fill, priority, ...props }) => {
    return <img {...props} />
  },
}))

// Mock fetch
global.fetch = jest.fn()

// jsdom does not implement window.scrollTo; components call it on page
// changes (Pagination) and menu interactions (Header/MobileNav).
window.scrollTo = jest.fn()

// Mock IntersectionObserver (used by FeaturedCars, LatestArticles, WhyRahnavard for scroll animations)
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this._elements = new Set()
  }
  observe(element) {
    this._elements.add(element)
  }
  unobserve(element) {
    this._elements.delete(element)
  }
  disconnect() {
    this._elements.clear()
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock
