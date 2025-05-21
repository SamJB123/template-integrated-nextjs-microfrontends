import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['docs', 'teams', 'metrics'],
  turbopack: {
    // Equivalent to webpack.resolve.alias
    resolveAlias: {
      // Turbopack only matches exact specifiers (no prefix matching),
      // so map the concrete reference used by feature packages:
      '@web/app/globals.css': './app/globals.css',
      '@ai-colab-platform/core/globals.css': './app/globals.css',
    },
  },
};

export default nextConfig;
