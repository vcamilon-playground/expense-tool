/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@expense/shared'],
  images: { unoptimized: true },
};
module.exports = nextConfig;
