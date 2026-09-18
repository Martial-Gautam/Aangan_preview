/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@dagrejs/dagre', '@dagrejs/graphlib'],
  async redirects() {
    return [
      // The landing page now lives at the root so crawlers get real content at
      // the domain. In-app pages still send logged-out users to /welcome; this
      // consolidates that old URL rather than touching each of them.
      { source: '/welcome', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
