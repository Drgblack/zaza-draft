/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.js$/,
      parser: { amd: false },
    });

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("sib-api-v3-sdk");
    }

    return config;
  },
};

export default nextConfig;
