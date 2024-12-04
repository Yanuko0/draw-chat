import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config: any) => {
    if (!config.resolve) {
      config.resolve = {};
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig;