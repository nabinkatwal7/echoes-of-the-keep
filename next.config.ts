import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/play", destination: "/campaigns", permanent: false }];
  },
};

export default nextConfig;
