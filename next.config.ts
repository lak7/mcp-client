import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["child_process", "readline"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load these modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        readline: false,
      };
    }
    return config;
  },
};

export default nextConfig;
