import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  // Standalone output is only for the single-container Docker/Fly build;
  // Vercel manages its own output format and would fail on "standalone".
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: path.join(__dirname, "../..")
};

export default nextConfig;
