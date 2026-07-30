import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      // Avoid eval-source-map producing invalid quoted chunks in this
      // Windows/Next.js development environment.
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
};

export default nextConfig;
