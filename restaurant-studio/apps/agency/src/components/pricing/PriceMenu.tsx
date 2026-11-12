import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { catering, firstSentence, maintenance, money, premium, pricing, starter } from "@/lib/pricing";

/**
 * Prices typeset the way a restaurant prints them: the name, a dotted leader, the price at the
 * right edge, and the description underneath. Every figure is read from pricing.json.
 */
export function MenuLine({
  name,
  price,
  unit,
  children,
  size = "md",
  id,
}: {
  name: string;
  price: number;
  /** For example "a month". */
  unit?: string;
  children?: ReactNode;
  size?: "md" | "lg";
  id?: string;
}) {
  const type = size === "lg" ? "text-[1.6rem] sm:text-[2.1rem]" : "text-[1.35rem] sm:text-[1.6rem]";
  return (
    <div id={id} className="scroll-mt-28">
      <div className="flex items-end gap-3">
        <h3 className={`display ${type} leading-[1.08]`}>{name}</h3>
        <span className="leader" aria-hidden="true" />
        <p className={`display nums whitespace-nowrap ${type} leading-[1.08]`}>
          {money(price)}
          {unit && <span className="ml-1.5 font-mono text-[0.72rem] font-medium tracking-[0.06em] text-ink-soft">{unit}</span>}
        </p>
      </div>
      {children}
    </div>
  );
}

/** A centered monospace heading between two hairlines, like the section titles on a printed menu. */
export function MenuSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-4 font-mono text-[0.74rem] font-medium uppercase tracking-[0.2em] text-accent before:h-px before:flex-1 before:bg-rule-strong after:h-px after:flex-1 after:bg-rule-strong">
      {children}
    </h3>
  );
}

export function IncludesList({ items, columns = false }: { items: string[]; columns?: boolean }) {
  return (
    <ul className={`grid gap-x-8 gap-y-2.5 text-[0.98rem] ${columns ? "sm:grid-cols-2" : ""}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Icon name="check" className="mt-[0.3rem] size-4 text-accent" strokeWidth={2} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const briefNote = "mt-1.5 max-w-[52ch] text-[0.98rem] text-ink-soft";

/** The short version for the home page: four lines and the payment terms. */
export function PriceMenuBrief() {
  return (
    <div className="menu-card px-6 py-9 sm:px-10 sm:py-12">
      <p className="text-center font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-ink-soft">
        Price list
      </p>
      <p className="display mt-2 text-center text-[2rem] italic leading-none text-accent">The menu</p>

      <div className="mt-8 grid gap-7">
        <MenuLine name={starter.name} price={starter.price}>
          <p className={briefNote}>{firstSentence(starter.summary)}</p>
        </MenuLine>
        <MenuLine name={premium.name} price={premium.price}>
          <p className={briefNote}>{firstSentence(premium.summary)}</p>
        </MenuLine>
        <MenuLine name={catering.name} price={catering.price}>
          <p className={briefNote}>An add-on. {firstSentence(catering.summary)}</p>
        </MenuLine>
        <MenuLine name={maintenance.name} price={maintenance.pricePerMonth} unit="a month">
          <p className={briefNote}>Optional. {firstSentence(maintenance.summary)}</p>
        </MenuLine>
      </div>

      <hr className="dash-rule mt-9" />
      <p className="mt-5 text-center font-mono text-[0.76rem] leading-relaxed tracking-[0.04em] text-ink-soft">
        {pricing.depositPercent}% to start <span aria-hidden="true">·</span> {100 - pricing.depositPercent}% when you
        approve the site
      </p>
    </div>
  );
}
