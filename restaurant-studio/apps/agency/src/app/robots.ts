import type { MetadataRoute } from "next";

import { indexable, siteUrl } from "@/lib/studio";

export default function robots(): MetadataRoute.Robots {
  // Until studio.json has the real address, keep search engines out (see `npm run preflight`).
  if (!indexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
