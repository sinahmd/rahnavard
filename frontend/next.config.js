/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rahnavard.co',
        pathname: '/media/**',
      },
    ],
  },
  // Allow localhost in development for media images
  ...(process.env.NODE_ENV === 'development' && {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'rahnavard.co',
          pathname: '/media/**',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
          pathname: '/media/**',
        },
      ],
    },
  }),
}

module.exports = nextConfig
