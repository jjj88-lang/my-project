import { ImageResponse } from "next/og";

import { palette } from "@/lib/design/palette";
import { studio } from "@/lib/studio";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhones. iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: palette.accent,
          color: palette.paper,
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        {studio.name.trim().charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
