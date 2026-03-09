/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/.well-known/security.txt",
        headers: [
          { key: "Content-Type", value: "text/plain" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/humans.txt",
        headers: [
          { key: "Content-Type", value: "text/plain" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },

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
