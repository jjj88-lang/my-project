import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/Icon";
import { site } from "@/lib/site";
import { telHref } from "@/lib/site/format";
import { studio } from "@/lib/studio";

/**
 * Sample sites have no real ordering or booking system, so their Order and Reserve buttons
 * lead here: a plain explanation of what the button does on a real client's site.
 */
export function SamplePlaceholder({
  icon,
  title,
  lead,
  providers,
  note,
}: {
  icon: IconName;
  title: string;
  lead: string;
  providers: string[];
  note: string;
}) {
  return (
    <section className="py-20 md:py-28">
      <div className="container-site max-w-3xl">
        <span className="grid size-14 place-items-center rounded-full border border-accent/60 text-accent">
          <Icon name={icon} className="size-6" />
        </span>
        <p className="eyebrow mt-8">Sample concept</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)]">{title}</h1>
        <p className="mt-6 text-[1.08rem] leading-[1.8] text-muted">{lead}</p>

        <div className="mt-10 rounded-site border border-line bg-surface p-6 md:p-8">
          <h2 className="eyebrow">Works with the system you already use</h2>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {providers.map((p) => (
              <li key={p} className="rounded-full border border-line px-4 py-1.5 text-sm">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[0.95rem] leading-relaxed text-muted">{note}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/menu" className="btn btn-solid">
            Back to the menu
          </Link>
          <a href={telHref(site.contact.phone)} className="btn btn-ghost">
            <Icon name="phone" className="size-4" />
            <span className="nums">{site.contact.phone}</span>
          </a>
        </div>
        <p className="mt-10 text-sm text-muted">
          {site.name} is a demonstration by {studio.name}. The phone number above is fictional.
        </p>
      </div>
    </section>
  );
}
