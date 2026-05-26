import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // chiron-daemon: isolate-build-dirs
  // Separate dev (.next/) from production build (.next-build/) so the
  // agent's AC-verification "next build" doesn't clobber the supervised
  // "next dev" chunks. Production deploys use NODE_ENV=production and
  // see .next-build/ for both build and start (consistent).
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  experimental: {
    // Server Actions are stable in Next.js 15, no flag needed
  },
  // Ensure Prisma client can be used in server components
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
