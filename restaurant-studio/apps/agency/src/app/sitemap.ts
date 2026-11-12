import type { MetadataRoute } from "next";

import { INDEXED_ROUTES } from "@/lib/nav";
import { siteUrl } from "@/lib/studio";

/** Every public page. /pay and /thanks are left out on purpose: they are noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_ROUTES.map((route) => ({
    url: `${siteUrl}${route === "/" ? "" : route}`,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : route === "/services" || route === "/work" ? 0.8 : 0.6,
  }));
}
