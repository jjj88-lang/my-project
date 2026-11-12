import { ImageResponse } from "next/og";

import { palette } from "@/lib/design/palette";
import { catering, lowestPrice, maintenance, money, premium, starter } from "@/lib/pricing";
import { studio } from "@/lib/studio";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${studio.name}: ${studio.tagline}`;

/** Link-preview card, set like the top of a printed menu. Every figure comes from pricing.json. */
export default function OpengraphImage() {
  const lines = [
    [starter.name, money(starter.price)],
    [premium.name, money(premium.price)],
    [catering.name, `+${money(catering.price)}`],
    [maintenance.name, `${money(maintenance.pricePerMonth)}/mo`],
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 64,
          background: palette.paper,
          color: palette.ink,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: palette.accent }}>
            {studio.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 82, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
              Your restaurant&rsquo;s website, handled.
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 30, color: palette.inkSoft }}>
              {`${studio.tagline}. From ${money(lowestPrice)}.`}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: palette.inkSoft }}>{studio.serviceAreas.join(" · ")}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: 56,
            padding: "36px 36px",
            width: 416,
            background: palette.card,
            border: `2px solid ${palette.ink}26`,
          }}
        >
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", color: palette.inkSoft }}>
            The menu
          </div>
          {lines.map(([name, price]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 26,
                paddingBottom: 12,
                borderBottom: `2px dashed ${palette.ink}55`,
                fontSize: 22,
              }}
            >
              <span style={{ display: "flex", maxWidth: 250 }}>{name}</span>
              <span style={{ display: "flex", color: palette.accent, fontWeight: 700 }}>{price}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
