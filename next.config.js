/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['@supabase/realtime-js'],
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /@supabase\/realtime-js/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    return config;
  },
};

module.exports = nextConfig;