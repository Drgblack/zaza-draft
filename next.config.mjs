/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.parser = config.module.parser || {};
    config.module.parser.javascript = {
      ...(config.module.parser.javascript || {}),
      amd: false,
    };
    return config;
  },
};

export default nextConfig;
