import { photo, site } from "@/lib/site";
import { addressLines, telHref } from "@/lib/site/format";
import { groupHours } from "@/lib/site/hours";
import { navItems, orderLink, reserveLink } from "@/lib/site/nav";

import { HeaderShell } from "./HeaderShell";
import { Logo } from "./Logo";

export function Header() {
  const [line1, line2] = addressLines(site.contact.address);
  const hours = groupHours(site.hours);

  return (
    <HeaderShell
      logo={<Logo />}
      nav={navItems}
      order={orderLink}
      reserve={reserveLink}
      phone={site.contact.phone}
      phoneHref={telHref(site.contact.phone)}
      overlayOnHome={site.theme.hero === "cinematic" && Boolean(photo(site.hero.media.image) || site.hero.media.art)}
      drawerFooter={
        <div className="grid gap-5">
          <address className="not-italic leading-relaxed">
            {line1}
            <br />
            {line2}
          </address>
          <dl className="grid gap-1">
            {hours.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt>{row.label}</dt>
                <dd className="nums text-right text-ink/85">{row.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      }
    />
  );
}
