import { ImageResponse } from "next/og";

import { palette } from "@/lib/design/palette";
import { studio } from "@/lib/studio";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon: the studio's initial in paper on the accent, like a stamped ticket. */
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
          background: palette.accent,
          color: palette.paper,
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 14,
        }}
      >
        {studio.name.trim().charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
