/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ESLint already runs in CI pipeline (ci.yml) — skip during docker build to prevent hangs
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rahnavard.co',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'rahnavard.co',
        pathname: '/media/**',
      },
    ],
  },
  // i18n is handled via <html lang="fa" dir="rtl"> in layout.tsx
  // Do NOT use i18n config here — it's Pages Router only
}

module.exports = nextConfig
