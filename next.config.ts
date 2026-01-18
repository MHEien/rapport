import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - allowedDevOrigins is valid for dev but missing in types
    allowedDevOrigins: ["localhost:3000", "192.168.68.107:3000"],
  },
};

export default nextConfig;
