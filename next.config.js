/** @type {import('next').NextConfig} */

function supabaseImageRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;

  try {
    const { hostname } = new URL(raw);
    if (!hostname) return null;
    return {
      protocol: 'https',
      hostname,
      pathname: '/storage/v1/object/**',
    };
  } catch {
    return null;
  }
}

const supabasePattern = supabaseImageRemotePattern();

const nextConfig = {
  serverExternalPackages: ['web-push', 'sharp'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabasePattern ? [supabasePattern] : [],
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
