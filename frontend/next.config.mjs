import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, '');
const parsedBackendUrl = BACKEND_URL ? new URL(BACKEND_URL) : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    if (!BACKEND_URL) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: parsedBackendUrl
      ? [
          {
            protocol: parsedBackendUrl.protocol.replace(':', ''),
            hostname: parsedBackendUrl.hostname,
            port: parsedBackendUrl.port || '',
          },
        ]
      : [],
  },
};

export default nextConfig;
