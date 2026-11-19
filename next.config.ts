import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'lafvgkbxmxwhvgiwnxgp.supabase.co',
      },
    ],
  },
};

export default nextConfig;
