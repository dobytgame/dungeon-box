/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: '/lp2',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
