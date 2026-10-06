import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@espelhomeu/shared"],
  poweredByHeader: false,
};

export default nextConfig;
