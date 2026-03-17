/**
 * ============================================
 * FEEL ME - Configuration Next.js
 * Options : images, body size limit pour upload
 * ============================================
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* --- Autoriser les images de toutes origines --- */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  /* --- Packages Node.js natifs exclus du bundling (nécessaire pour Sequelize/pg) --- */
  serverExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  /* --- Augmenter la taille max des payloads API (images base64) --- */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
