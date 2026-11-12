import { ImageResponse } from "next/og";

import { site, theme } from "@/lib/site";
import { place } from "@/lib/site/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name}${site.descriptor ? `, ${site.descriptor}` : ""}`;

/** Link-preview card (shown when the site is shared in messages and on social media). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: theme.bg,
          color: theme.ink,
          backgroundImage: `radial-gradient(circle at 85% 90%, ${theme.accent}55, transparent 55%)`,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: theme.accent }}>
          {site.descriptor ?? site.cuisines.join(" · ")}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -4 }}>{site.name}</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 38, color: theme.muted, maxWidth: 900 }}>{site.tagline}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: theme.muted }}>
          <span>{place}</span>
          <span>{site.contact.phone}</span>
        </div>
      </div>
    ),
    size,
  );
}
