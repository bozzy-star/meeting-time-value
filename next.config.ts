import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin workspace root to this project (avoids the multi-lockfile warning).
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
