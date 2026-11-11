import type { MetadataRoute } from "next";

import { site, theme } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.descriptor ? `${site.name} ${site.descriptor}` : site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "browser",
    background_color: theme.bg,
    theme_color: theme.bg,
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
