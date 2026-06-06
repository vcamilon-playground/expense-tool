/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const pkg = require('./package.json');

// Resolve build SHA: Vercel injects VERCEL_GIT_COMMIT_SHA, fall back to local git
let buildSha = 'dev';
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  buildSha = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
} else {
  try {
    buildSha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // not in a git repo or git not available
  }
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@expense/shared'],
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_SHA: buildSha,
  },
};
module.exports = nextConfig;
