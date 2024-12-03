import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: '/draw-chat',  // 類似於 Vite 的 base 配置 
  distDir: 'docs',            // 類似於 Vite 的 outDir 配置
  images: {
    unoptimized: true,
    domains: ['draw-chat'],
  },
  
};

export default nextConfig;
