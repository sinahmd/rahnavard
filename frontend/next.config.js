const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { instrumentationHook: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'rahnavard.co', pathname: '/media/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/media/**' },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  tunnelRoute: '/monitoring-tunnel',
  release: { name: process.env.SENTRY_RELEASE, create: false, finalize: false },
})
