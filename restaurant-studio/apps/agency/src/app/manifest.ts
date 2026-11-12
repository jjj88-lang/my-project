import type { MetadataRoute } from "next";

import { palette } from "@/lib/design/palette";
import { siteDescription } from "@/lib/seo";
import { studio } from "@/lib/studio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: studio.name,
    short_name: studio.name.split(" ")[0],
    description: siteDescription,
    start_url: "/",
    display: "browser",
    background_color: palette.paper,
    theme_color: palette.paper,
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
