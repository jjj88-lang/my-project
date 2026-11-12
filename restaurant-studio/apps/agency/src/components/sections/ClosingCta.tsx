import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { FIRST_CALL_MINUTES, INQUIRY_REPLY_TIME } from "@/content/facts";

/** The band that closes most pages: one invitation, two ways to take it up. */
export function ClosingCta({
  title = (
    <>
      A free {FIRST_CALL_MINUTES}-minute call. <em>No pressure.</em>
    </>
  ),
  children,
  showWorkLink = true,
}: {
  title?: ReactNode;
  children?: ReactNode;
  showWorkLink?: boolean;
}) {
  return (
    <section className="on-accent bg-accent text-card">
      <div className="shell grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="reveal lg:col-span-8">
          <p className="eyebrow">Start here</p>
          <h2 className="display display-lg mt-5">{title}</h2>
          <div className="lead mt-6 max-w-[46ch]">
            {children ?? (
              <p>
                Tell me about your restaurant and what is not working on the site today. I will tell you plainly
                whether I can help and what it would cost. I reply personally, usually {INQUIRY_REPLY_TIME}.
              </p>
            )}
          </div>
        </div>
        <div className="reveal flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-stretch">
          <Link href="/contact" className="btn btn-on-accent">
            Book a free {FIRST_CALL_MINUTES}-minute call
            <Icon name="arrow" className="btn-arrow size-5" />
          </Link>
          {showWorkLink && (
            <Link href="/work" className="btn btn-ghost-on-accent">
              See the sample site
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
