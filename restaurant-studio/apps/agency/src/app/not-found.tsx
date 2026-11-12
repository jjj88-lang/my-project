import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <section className="shell py-24 md:py-32">
      <div className="max-w-[40rem]">
        <p className="eyebrow nums">Ticket 404</p>
        <h1 className="display display-lg mt-5">
          That page is <em>not on the menu.</em>
        </h1>
        <p className="lead mt-6 text-ink-soft">
          The link may be old, or the address may have a typo. Everything the site offers is one step from here.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/" className="btn btn-primary">
            Back to the home page
            <Icon name="arrow" className="btn-arrow size-5" />
          </Link>
          <Link href="/services" className="btn btn-ghost">
            Prices and packages
          </Link>
        </div>
      </div>
    </section>
  );
}
