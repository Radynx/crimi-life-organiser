import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const publicBasePath = isGitHubPages ? '/crimi-life-organiser' : '';

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: publicBasePath,
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: publicBasePath },
};

export default nextConfig;
