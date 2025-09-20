/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: '/auth/phone', destination: '/auth/login', permanent: false },
      { source: '/profile', destination: '/dashboard', permanent: false },
    ];
  },
};

module.exports = nextConfig;
