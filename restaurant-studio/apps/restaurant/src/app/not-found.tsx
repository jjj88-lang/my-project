import Link from "next/link";

import { Art } from "@/components/ui/Art";
import { isPremium, site } from "@/lib/site";
import { telHref } from "@/lib/site/format";

export default function NotFound() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-site max-w-2xl text-center">
        <Art motif={site.logo.mark ?? "bowl"} className="mx-auto size-24 text-accent" strokeWidth={1} />
        <p className="eyebrow mt-8">Page not found</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)]">That page is off the menu.</h1>
        <p className="mx-auto mt-5 max-w-md text-muted">
          The link may be old or mistyped. Here is where most people are headed.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={isPremium ? "/menu" : "/#menu"} className="btn btn-solid">
            View the menu
          </Link>
          <Link href={isPremium ? "/contact" : "/#visit"} className="btn btn-ghost">
            Hours &amp; location
          </Link>
          <a href={telHref(site.contact.phone)} className="btn btn-ghost nums">
            Call {site.contact.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
