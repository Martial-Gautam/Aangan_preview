/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@dagrejs/dagre', '@dagrejs/graphlib'],
};

export default nextConfig;
