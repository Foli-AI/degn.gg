/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    // Handle Phaser's canvas and audio dependencies
    config.externals.push({
      canvas: 'canvas',
    });
    return config;
  },
};

module.exports = nextConfig;


