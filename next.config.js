/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: '/checkout/success',
        destination: '/assinatura-confirmada',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
