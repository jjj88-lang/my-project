"use client";

import { useSyncExternalStore } from "react";

import { getOpenStatus } from "@/lib/site/hours";
import type { SiteConfig } from "@/lib/site/schema";

/** Re-render once a minute so the badge flips at opening and closing time. */
function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);

/**
 * "Open now · until 9:30 PM". Computed in the browser from the restaurant's own
 * time zone, so it is correct for the visitor's moment and the page itself stays static.
 * Before JavaScript runs (and for search engines) it renders nothing.
 */
export function OpenStatus({
  hours,
  timeZone,
  className = "",
}: {
  hours: SiteConfig["hours"];
  timeZone: string;
  className?: string;
}) {
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  if (minute === null) return <span className={`inline-block min-h-6 ${className}`} />;

  const status = getOpenStatus(hours, new Date(minute * 60_000), timeZone);
  return (
    <span className={`inline-flex min-h-6 items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${status.open ? "bg-[#5fbf7f] shadow-[0_0_0_4px_rgb(95_191_127/0.2)]" : "bg-muted/70"}`}
      />
      <span>
        <span className="font-semibold">{status.label}</span>
        {status.detail && <span className="text-muted"> · {status.detail}</span>}
      </span>
    </span>
  );
}
