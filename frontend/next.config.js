/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rahnavard.co", pathname: "/media/**" },
      { protocol: "http", hostname: "backend", port: "8000", pathname: "/media/**" },
    ],
  },
}
module.exports = nextConfig
