import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@espelhomeu/shared"],
  poweredByHeader: false,
  // Protótipo estático de 10 ecrãs (public/prototipo) para entrevistas do E03: fora dos motores de busca.
  async rewrites() {
    return [{ source: "/prototipo", destination: "/prototipo/index.html" }];
  },
  async headers() {
    return [{ source: "/prototipo/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
