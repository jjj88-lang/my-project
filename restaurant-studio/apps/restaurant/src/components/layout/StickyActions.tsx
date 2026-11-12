import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/Icon";
import { isPremium, site } from "@/lib/site";
import { directionsUrl, telHref } from "@/lib/site/format";
import { orderLink, reserveLink } from "@/lib/site/nav";

type Item = { label: string; href: string; icon: IconName; external?: boolean; primary?: boolean };

/**
 * Phone-only bar pinned to the bottom of the screen with the three things a guest
 * on a phone most often wants: call, get directions, and order (or see the menu).
 */
export function StickyActions() {
  const third: Item = orderLink
    ? { label: "Order", href: orderLink.href, icon: "bag", external: orderLink.external, primary: true }
    : reserveLink
      ? { label: "Reserve", href: reserveLink.href, icon: "calendar", external: reserveLink.external, primary: true }
      : { label: "Menu", href: isPremium ? "/menu" : "/#menu", icon: "utensils", primary: true };

  const items: Item[] = [
    { label: "Call", href: telHref(site.contact.phone), icon: "phone" },
    { label: "Directions", href: directionsUrl(site), icon: "pin", external: true },
    third,
  ];

  return (
    <nav
      aria-label="Quick actions"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid h-[var(--actionbar-h)] grid-cols-3">
        {items.map((item) => {
          const className = `flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${
            item.primary ? "bg-accent text-on-accent" : "text-ink"
          }`;
          const content = (
            <>
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </>
          );
          return (
            <li key={item.label}>
              {item.href.startsWith("/") ? (
                <Link href={item.href} className={className}>
                  {content}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className={className}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {content}
                  {item.external && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
