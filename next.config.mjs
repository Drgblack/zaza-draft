/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Disable AMD parsing for some generated SDK bundles
    config.module.rules.push({
      test: /\.js$/,
      parser: { amd: false },
    });

    return config;
  },
};

export default nextConfig;
