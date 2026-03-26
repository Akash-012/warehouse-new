import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const backendHost = new URL(BACKEND_URL).hostname;
const backendPort = new URL(BACKEND_URL).port || '';
const backendProtocol = new URL(BACKEND_URL).protocol.replace(':', '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: backendProtocol,
        hostname: backendHost,
        port: backendPort,
      },
    ],
  },
};

export default nextConfig;
