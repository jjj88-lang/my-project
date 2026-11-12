import { ImageResponse } from "next/og";

import { site, theme } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon generated from the brand colors: the restaurant's initial on its background color. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.bg,
          color: theme.accent,
          fontSize: 44,
          fontWeight: 700,
          border: `3px solid ${theme.accent}`,
          borderRadius: 12,
        }}
      >
        {site.name.trim().charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
