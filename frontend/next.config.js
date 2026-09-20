const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { instrumentationHook: true },
  // Phase 6 (ADR-0010): Next 14.2's default SWC minifier cannot parse
  // pdf.js 5.x's modern syntax (pdf.mjs / pdf.worker.min.mjs), failing the
  // production build with "failed to parse input file". Falling back to the
  // bundled terser minifier (swcMinify: false) parses it correctly; output
  // behavior is identical, bundle size differs only marginally.
  swcMinify: false,
  webpack(config) {
    // Phase 6 (ADR-0010): the PDF.js worker is a pre-minified asset.
    // `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` in
    // components/car/pdfjs.ts must be emitted as a static same-origin file,
    // not parsed by the JS pipeline — SWC cannot parse the minified blob.
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.mjs$/,
      type: 'asset/resource',
      generator: { filename: 'static/media/[name].[hash][ext][query]' },
    })
    return config
  },
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
