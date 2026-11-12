import { Icon } from "@/components/ui/Icon";
import { OpenStatus } from "@/components/ui/OpenStatus";
import { site } from "@/lib/site";
import { addressLines, directionsUrl, mapsUrl, telHref } from "@/lib/site/format";
import { formatShortDate, groupHours, upcomingExceptions } from "@/lib/site/hours";
import { getToday } from "@/lib/site/today";

/** A stylized map card. It links out to Google Maps instead of embedding it: faster, and no tracking scripts. */
function MapCard() {
  const [line1, line2] = addressLines(site.contact.address);
  return (
    <a
      href={mapsUrl(site)}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative isolate block aspect-[16/10] overflow-hidden rounded-site border border-line bg-surface"
    >
      <svg
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 size-full text-ink transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <g opacity="0.14" strokeWidth="1">
          <path d="M-20 70h680M-20 150h680M-20 250h680M-20 330h680" />
          <path d="M70-20v440M170-20v440M290-20v440M410-20v440M530-20v440" />
        </g>
        <g opacity="0.22" strokeWidth="9" strokeLinecap="round">
          <path d="M-20 200h680" />
          <path d="M350-20v440" />
        </g>
        <path d="M-20 392C120 330 180 300 260 210S470 60 660 20" opacity="0.2" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M-20 392C120 330 180 300 260 210S470 60 660 20"
          className="text-accent"
          opacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute left-[54.7%] top-1/2 grid size-12 -translate-x-1/2 -translate-y-full place-items-center"
        aria-hidden="true"
      >
        <span className="absolute bottom-0 size-3 translate-y-1/2 rounded-full bg-accent/40 blur-[2px]" />
        <Icon name="pin" className="size-12 fill-accent text-bg" strokeWidth={1} />
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent,var(--c-bg)_70%)] p-5 pt-16">
        <span>
          <span className="block font-semibold">{line1}</span>
          <span className="block text-sm text-muted">{line2}</span>
        </span>
        <span className="link-arrow shrink-0 border-0 text-[0.72rem]">
          Open in Maps
          <Icon name="external" className="size-4" />
        </span>
      </span>
      <span className="sr-only"> (opens Google Maps in a new tab)</span>
    </a>
  );
}

/** Hours, address, phone and directions. The section every restaurant site must get right. */
export async function Visit({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  const { date } = await getToday();
  const rows = groupHours(site.hours);
  const holidays = upcomingExceptions(site.hours, date);
  const [line1, line2] = addressLines(site.contact.address);

  return (
    <section id="visit" className="py-20 md:py-28" aria-labelledby="visit-heading">
      <div className="container-site">
        <div className="reveal">
          <p className="eyebrow">Hours &amp; location</p>
          <Heading id="visit-heading" className="display mt-4 text-[clamp(2.2rem,5vw,4rem)]">
            Come and see us
          </Heading>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="reveal lg:col-span-5">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <h3 className="eyebrow">Hours</h3>
              <OpenStatus hours={site.hours} timeZone={site.timezone} className="text-sm" />
            </div>
            <dl>
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                  <dt className="font-medium">{row.label}</dt>
                  <dd className={`nums text-right ${row.closed ? "text-muted" : ""}`}>
                    {row.intervals.map((interval) => (
                      <span key={interval} className="block">
                        {interval}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>

            {holidays.length > 0 && (
              <div className="mt-6 rounded-site border border-accent/40 bg-accent/[0.06] p-5">
                <h4 className="eyebrow">Holiday hours</h4>
                <dl className="mt-3 grid gap-1.5 text-[0.95rem]">
                  {holidays.map((h) => (
                    <div key={h.date} className="flex justify-between gap-6">
                      <dt>
                        {h.label ? `${h.label}, ` : ""}
                        {formatShortDate(h.date)}
                      </dt>
                      <dd className="nums text-right font-medium">{h.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {site.hours.notes.length > 0 && (
              <ul className="mt-6 grid gap-1.5 text-sm text-muted">
                {site.hours.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="reveal lg:col-span-6 lg:col-start-7">
            <MapCard />
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="eyebrow">Find us</h3>
                <address className="mt-3 not-italic leading-relaxed">
                  {line1}
                  <br />
                  {line2}
                </address>
                {site.contact.neighborhood && <p className="mt-2 text-sm text-muted">{site.contact.neighborhood}</p>}
                {site.contact.parking && <p className="mt-2 text-sm text-muted">{site.contact.parking}</p>}
              </div>
              <div>
                <h3 className="eyebrow">Call or write</h3>
                <p className="mt-3">
                  <a href={telHref(site.contact.phone)} className="nums text-lg font-medium hover:text-accent">
                    {site.contact.phone}
                  </a>
                </p>
                {site.contact.email && (
                  <p className="mt-1">
                    <a href={`mailto:${site.contact.email}`} className="text-muted [overflow-wrap:anywhere] hover:text-accent">
                      {site.contact.email}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={directionsUrl(site)} target="_blank" rel="noopener noreferrer" className="btn btn-solid">
                <Icon name="pin" className="size-4" />
                Get directions
                <span className="sr-only"> (opens Google Maps in a new tab)</span>
              </a>
              <a href={telHref(site.contact.phone)} className="btn btn-ghost">
                <Icon name="phone" className="size-4" />
                Call us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
