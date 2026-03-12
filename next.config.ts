import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true" || process.env.GITHUB_ACTIONS === "true";
const repoName = "Economic-profile-of-Italian-regions";
const basePath = isGitHubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : "standalone",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_HOSTING: isGitHubPages ? "true" : "false",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
