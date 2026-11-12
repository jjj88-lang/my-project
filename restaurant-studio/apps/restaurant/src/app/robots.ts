import type { MetadataRoute } from "next";

import { site } from "@/lib/site";
import { siteUrl } from "@/lib/site/seo";

export default function robots(): MetadataRoute.Robots {
  // Sample sites are fictional restaurants: keep them out of search engines entirely.
  if (site.sample) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
