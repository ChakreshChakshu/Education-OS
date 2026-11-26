/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: '/reset-password',
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }]
    }];
  },
  async rewrites() {
    const configuredApi = process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_URL;
    const apiOrigin = configuredApi?.startsWith('http') ? new URL(configuredApi).origin : 'http://localhost:3001';
    return [
      { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      { source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
