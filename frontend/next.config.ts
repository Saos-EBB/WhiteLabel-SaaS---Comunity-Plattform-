import type { NextConfig } from "next";

// Server-to-server: default is plain localhost (frontend runs on the host),
// overridden to the docker-compose service name (http://nestjs:3000) when
// the frontend itself runs inside the container.
const backendInternalUrl = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.156'],
  rewrites: async () => [
    {
      source: '/uploads/:path*',
      destination: `${backendInternalUrl}/uploads/:path*`,
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
