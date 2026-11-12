import Link from "next/link";

import { CONTACT, NAV } from "@/lib/nav";
import { contactEmail, contactPhone, mailingAddress, serviceAreaText, studio, telHref } from "@/lib/studio";
import { getYear } from "@/lib/today";

import { Wordmark } from "./Wordmark";

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="eyebrow mb-3">{children}</h2>;
}

const footerLink = "inline-flex min-h-11 min-w-11 items-center text-on-band underline-offset-4 hover:underline";

export async function Footer() {
  const year = await getYear();

  return (
    <footer className="on-band no-print mt-auto bg-band text-on-band">
      <div className="shell py-14 lg:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-12 lg:gap-8">
          <div className="col-span-2 lg:col-span-5">
            <Wordmark size="lg" tone="on-band" />
            <p className="mt-5 max-w-sm text-on-band-soft">
              {studio.tagline}. Serving {serviceAreaText}
              {studio.worksRemotely ? ", and working remotely with restaurants anywhere in the United States" : ""}.
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-2 lg:col-start-7">
            <FooterHeading>Studio</FooterHeading>
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <FooterHeading>Fine print</FooterHeading>
            <ul>
              <li>
                <Link href="/pay" className={footerLink}>
                  Payments
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={footerLink}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLink}>
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-2">
            <FooterHeading>Contact</FooterHeading>
            <ul>
              <li>
                <Link href={CONTACT.href} className={footerLink}>
                  {CONTACT.label}
                </Link>
              </li>
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className={`${footerLink} [overflow-wrap:anywhere]`}>
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={telHref(contactPhone)} className={`${footerLink} nums`}>
                    {contactPhone}
                  </a>
                </li>
              )}
            </ul>
            {mailingAddress && <p className="mt-2 text-[0.95rem] text-on-band-soft">{mailingAddress}</p>}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-rule-on-band pt-6 text-[0.92rem] text-on-band-soft md:flex-row md:items-baseline md:justify-between md:gap-8">
          <p>
            © {year} {studio.name}
          </p>
          <p className="max-w-xl md:text-right">
            {studio.demos.hibana.name} and {studio.demos.bulmat.name} are sample concepts: fictional restaurants
            created to show the work. They are not clients.
          </p>
        </div>
      </div>
    </footer>
  );
}
