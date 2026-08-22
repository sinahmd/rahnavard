/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'rahnavard.co',
        pathname: '/media/**',
      },
    ],
  },
  // Enable RTL support
  i18n: {
    locales: ['fa'],
    defaultLocale: 'fa',
  },
}

module.exports = nextConfig
