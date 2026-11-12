import { CONTACT, NAV } from "@/lib/nav";
import { contactEmail, contactPhone, serviceAreaText, studio, telHref } from "@/lib/studio";

import { HeaderShell } from "./HeaderShell";
import { Wordmark } from "./Wordmark";

export function Header() {
  return (
    <HeaderShell
      logo={<Wordmark />}
      homeLabel={`${studio.name}, home`}
      nav={NAV}
      contact={CONTACT}
      drawerFooter={
        <div className="grid gap-3 text-[0.95rem] text-ink-soft">
          <p>
            {studio.tagline}. Serving {serviceAreaText}
            {studio.worksRemotely ? ", and working remotely with restaurants anywhere in the United States" : ""}.
          </p>
          {(contactEmail || contactPhone) && (
            <ul className="grid gap-1">
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="link inline-flex min-h-11 items-center [overflow-wrap:anywhere]">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={telHref(contactPhone)} className="link nums inline-flex min-h-11 items-center">
                    {contactPhone}
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
      }
    />
  );
}
