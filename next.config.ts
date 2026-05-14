import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: '/uploads/:path*',
      destination: 'http://localhost:3000/uploads/:path*',
    },
  ],
};

export default nextConfig;
