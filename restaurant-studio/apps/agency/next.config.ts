import fs from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

/**
 * Every page the finished site has, besides the home page (see src/lib/nav.ts and the footer).
 *
 * With typedRoutes on, a link to a page that does not exist fails the type check instead of
 * shipping a 404. While the site is being built page by page that would fail every build, so
 * the check switches itself on as soon as all of these pages exist. Once they do, this helper
 * can be replaced with a plain `typedRoutes: true`.
 */
const PLANNED_PAGES = [
  "/about",
  "/contact",
  "/faq",
  "/pay",
  "/privacy",
  "/process",
  "/services",
  "/terms",
  "/thanks",
  "/work",
];

/** The routes that have a page file under src/app. Route groups such as (site) add no segment. */
function pagesIn(dir: string, segments: string[] = []): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      const isGroup = /^\(.+\)$/.test(entry.name);
      return pagesIn(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
    }
    return /^page\.(tsx|ts|jsx|js)$/.test(entry.name) ? [`/${segments.join("/")}`] : [];
  });
}

// This file's own folder when it is known, so the answer does not depend on where the build was started.
const appRoot = typeof __dirname === "string" ? __dirname : process.cwd();
const builtPages = pagesIn(path.join(appRoot, "src", "app"));
const everyPageExists = PLANNED_PAGES.every((route) => builtPages.includes(route));

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: everyPageExists,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          // No script restrictions here (static pages cannot carry per-request nonces). These four
          // directives stop the site being framed, re-based or used as a form target by other sites.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
