/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for some UMD/AMD-style generated SDKs
    config.module.rules.push({
      test: /\.js$/,
      parser: { amd: false },
    });

    // Critical: prevent bundling of Brevo SDK on the server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("sib-api-v3-sdk");
    }

    return config;
  },
};

export default nextConfig;
