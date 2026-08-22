import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      {
        source: '/clear-the-board',
        destination: 'https://theboard-mu.vercel.app/',
      },
      {
        source: '/clear-the-board/:path*',
        destination: 'https://theboard-mu.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
