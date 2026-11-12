import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  /*
   * Build output folder. Normally ".next". Set NEXT_DIST_DIR to keep two builds side by side,
   * for example to preview two clients at once:
   *   CLIENT=hibana NEXT_DIST_DIR=.next-hibana npm run build && NEXT_DIST_DIR=.next-hibana npx next start -p 3001
   *   CLIENT=bulmat NEXT_DIST_DIR=.next-bulmat npm run build && NEXT_DIST_DIR=.next-bulmat npx next start -p 3002
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
