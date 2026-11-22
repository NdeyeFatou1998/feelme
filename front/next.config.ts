/**
 * ============================================
 * FEEL ME - Configuration Next.js (frontend)
 * Proxy /api, /uploads et /aja vers le backend Railway
 * ============================================
 */

import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
      {
        // AJA : la porte à laquelle AJA frappe, servie par le backend
        source: "/aja",
        destination: `${API_URL}/aja`,
      },
    ];
  },
};

export default nextConfig;
