import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next.js 15, no flag needed
  },
  // Ensure Prisma client can be used in server components
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
