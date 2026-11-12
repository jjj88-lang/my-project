import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import type { FaqItem } from "@/content/faq";
import { smart } from "@/lib/text";

/**
 * Questions as native disclosure widgets: they work without JavaScript, with a keyboard,
 * and with a screen reader. Each has an id, so /faq#cost links straight to an answer.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="border-t border-rule-strong">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="border-b border-rule">
          <summary className="flex min-h-16 list-none items-start justify-between gap-6 py-5">
            <h3 className="display display-sm">{smart(item.q)}</h3>
            <span className="faq-mark" aria-hidden="true" />
          </summary>
          <div className="grid max-w-[64ch] gap-3 pb-7 pr-6 text-ink-soft">
            {item.a.map((paragraph) => (
              <p key={paragraph}>{smart(paragraph)}</p>
            ))}
            {item.link && (
              <p>
                <Link href={item.link.href} className="link-arrow">
                  {item.link.label}
                  <Icon name="arrow" className="size-4" />
                </Link>
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
