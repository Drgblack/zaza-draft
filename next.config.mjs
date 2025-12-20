/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Disable AMD parsing for some generated SDK bundles
    config.module.rules.push({
      test: /\.js$/,
      parser: { amd: false },
    });

    // Prevent bundling the Brevo SDK in server builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("sib-api-v3-sdk");
    }

    return config;
  },
};

export default nextConfig;
