import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";
import { getToday } from "@/lib/site/today";
import { studio } from "@/lib/studio";

/** Shown on fictional demo sites only, so nobody mistakes the sample for a real business. */
export function SampleStrip() {
  if (!site.sample) return null;
  return (
    <div className="no-print bg-ink text-bg">
      <p className="container-site py-2 text-center text-[0.74rem] font-semibold uppercase tracking-[0.14em]">
        Sample concept <span aria-hidden="true">·</span> a demonstration website by {studio.name}, not a real restaurant
      </p>
    </div>
  );
}

/** Optional one-line announcement (holiday hours, specials). Hides itself after its end date. */
export async function AnnouncementBar() {
  const a = site.announcement;
  if (!a) return null;
  if (a.until) {
    const { date } = await getToday();
    if (date > a.until) return null;
  }

  const body = (
    <span className="inline-flex items-center justify-center gap-2.5">
      <span>{a.text}</span>
      {a.href && <Icon name="arrow" className="size-4" />}
    </span>
  );

  return (
    <div className="no-print border-b border-line bg-surface text-sm text-ink/90">
      {a.href ? (
        <Link href={a.href} className="container-site block py-2.5 text-center transition-colors hover:text-accent">
          {body}
        </Link>
      ) : (
        <p className="container-site py-2.5 text-center">{body}</p>
      )}
    </div>
  );
}
