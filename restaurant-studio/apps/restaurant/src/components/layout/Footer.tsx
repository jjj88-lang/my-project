import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/Icon";
import { credits, site } from "@/lib/site";
import { addressLines, directionsUrl, telHref } from "@/lib/site/format";
import { groupHours } from "@/lib/site/hours";
import { giftCardLink, navItems, orderLink, reserveLink } from "@/lib/site/nav";
import { getToday } from "@/lib/site/today";
import { studio } from "@/lib/studio";

import { Logo } from "./Logo";

const SOCIAL: Array<{ key: keyof typeof site.links.social; label: string; icon: IconName }> = [
  { key: "instagram", label: "Instagram", icon: "instagram" },
  { key: "facebook", label: "Facebook", icon: "facebook" },
  { key: "tiktok", label: "TikTok", icon: "tiktok" },
  { key: "yelp", label: "Yelp", icon: "star" },
  { key: "google", label: "Google", icon: "pin" },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="eyebrow mb-4">{children}</h2>;
}

export async function Footer() {
  const { year } = await getToday();
  const [line1, line2] = addressLines(site.contact.address);
  const hours = groupHours(site.hours);
  const social = SOCIAL.filter((s) => site.links.social[s.key]);
  const actions = [orderLink, reserveLink, giftCardLink].filter((a) => a !== undefined);

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-surface pb-[var(--actionbar-h)]">
      <div className="pattern-waves pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-[0.05]" aria-hidden="true" />

      <div className="container-site relative py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo size="lg" />
            <p className="mt-5 max-w-xs text-muted">{site.tagline}</p>
            {social.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {social.map((s) => (
                  <li key={s.key}>
                    <a
                      href={site.links.social[s.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-11 place-items-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      <Icon name={s.icon} />
                      <span className="sr-only">
                        {site.name} on {s.label} (opens in a new tab)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Visit</FooterHeading>
            <address className="not-italic leading-relaxed">
              {line1}
              <br />
              {line2}
            </address>
            <ul className="mt-4 grid gap-2">
              <li>
                <a href={telHref(site.contact.phone)} className="nums inline-flex items-center gap-2.5 py-1 hover:text-accent">
                  <Icon name="phone" className="size-4 text-accent" />
                  {site.contact.phone}
                </a>
              </li>
              {site.contact.email && (
                <li>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="inline-flex items-center gap-2.5 py-1 [overflow-wrap:anywhere] hover:text-accent"
                  >
                    <Icon name="mail" className="size-4 text-accent" />
                    {site.contact.email}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={directionsUrl(site)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 py-1 hover:text-accent"
                >
                  <Icon name="pin" className="size-4 text-accent" />
                  Get directions
                  <span className="sr-only"> (opens Google Maps in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Hours</FooterHeading>
            <dl className="grid gap-1.5">
              {hours.map((row) => (
                <div key={row.label} className="flex justify-between gap-6">
                  <dt className="whitespace-nowrap text-muted">{row.label}</dt>
                  <dd className="nums text-right">
                    {row.intervals.map((interval) => (
                      <span key={interval} className="block whitespace-nowrap">
                        {interval}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-2">
            <FooterHeading>Explore</FooterHeading>
            <ul className="grid gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-block py-1 hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
              {actions.map((a) => (
                <li key={a.href}>
                  {a.external ? (
                    <a href={a.href} target="_blank" rel="noopener noreferrer" className="inline-block py-1 hover:text-accent">
                      {a.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={a.href} className="inline-block py-1 hover:text-accent">
                      {a.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {site.footer.note && (
          <p className="mt-14 max-w-3xl border-l-2 border-accent pl-4 text-sm text-muted">{site.footer.note}</p>
        )}

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {credits.length > 0 && (
              <li>
                <Link href="/credits" className="hover:text-accent">
                  Photo credits
                </Link>
              </li>
            )}
            {site.footer.studioCredit && (
              <li>
                Website by{" "}
                {studio.url ? (
                  <a href={studio.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-accent">
                    {studio.name}
                  </a>
                ) : (
                  <span className="text-ink">{studio.name}</span>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}
