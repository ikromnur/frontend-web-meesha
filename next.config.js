/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asset.kompas.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Izinkan gambar dari backend lokal (dev) jika mengembalikan URL absolut
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    // Prioritaskan internal backend URL untuk komunikasi server-to-server (Docker)
    const backend =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:4000";

    return [
      {
        source: "/api/payments/tripay/:path*",
        destination: `${backend}/api/payments/tripay/:path*`,
      },
      // Admin v1 endpoints
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
      // Notifications (assuming v1)
      {
        source: "/api/notifications/:path*",
        destination: `${backend}/api/v1/notifications/:path*`,
      },
      // Biarkan /api/orders ditangani oleh API Route Next (`src/app/api/orders/route.ts`)
    ];
  },
};

module.exports = nextConfig;
