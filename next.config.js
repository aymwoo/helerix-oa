/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // Configure webpack to handle native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // better-sqlite3 is a native module, needs to be external
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
