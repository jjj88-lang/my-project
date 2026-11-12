import type { MetadataRoute } from "next";

import { menu } from "@/lib/site";
import { routes } from "@/lib/site/nav";
import { siteUrl } from "@/lib/site/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = menu.updated ? new Date(`${menu.updated}T12:00:00Z`) : undefined;
  return routes.map((route) => ({
    url: `${siteUrl}${route === "/" ? "" : route}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: route === "/menu" || route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/menu" ? 0.9 : 0.6,
  }));
}
