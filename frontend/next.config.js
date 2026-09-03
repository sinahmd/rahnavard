/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rahnavard.co',
        pathname: '/media/**',
      },
    ],
  },
}
module.exports = nextConfig
