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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // No script restrictions here (static pages cannot carry per-request nonces); these four
          // directives stop the site being framed, re-based or used as a form target by other sites.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
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
