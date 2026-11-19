import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./Documentação inicial/Controle de Compras - Pokémon TCG - Página1.csv'],
  },
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
