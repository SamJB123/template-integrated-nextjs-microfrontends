import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@repo/directus": path.resolve(__dirname, "../../../shared_config/directus"),
    };
    return config;
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
