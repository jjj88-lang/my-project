import { menu } from "@/lib/site";
import { formatPrice } from "@/lib/site/format";
import { DEFAULT_TAGS, type MenuItem, type MenuSection } from "@/lib/site/schema";

const TAGS: Record<string, { label: string; short: string }> = { ...DEFAULT_TAGS, ...menu.tags };

/** Tags that are actually used on this menu, in a stable order, for the legend. */
export function usedTags(): Array<{ key: string; label: string; short: string }> {
  const used = new Set(menu.sections.flatMap((s) => s.items.flatMap((i) => i.tags)));
  return Object.entries(TAGS)
    .filter(([key]) => used.has(key))
    .map(([key, value]) => ({ key, ...value }));
}

function Price({ item }: { item: MenuItem }) {
  if (item.variants) {
    return (
      <span className="nums flex shrink-0 flex-wrap justify-end gap-x-4 text-right">
        {item.variants.map((v) => (
          <span key={v.label}>
            <span className="text-[0.82rem] text-muted">{v.label} </span>
            <span className="font-semibold">
              <span className="sr-only">$</span>
              {formatPrice(v.price)}
            </span>
          </span>
        ))}
      </span>
    );
  }
  if (item.price !== undefined) {
    return (
      <span className="nums shrink-0 font-semibold">
        <span className="sr-only">$</span>
        {formatPrice(item.price)}
      </span>
    );
  }
  if (item.priceText) return <span className="shrink-0 text-sm font-medium text-muted">{item.priceText}</span>;
  return null;
}

function Item({ item }: { item: MenuItem }) {
  return (
    <li className={`py-4 ${item.soldOut ? "opacity-60" : ""}`}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[1.04rem] font-semibold leading-snug">
          {item.name}
          {item.soldOut && <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted">Sold out</span>}
        </h3>
        <span className="leader" aria-hidden="true" />
        <Price item={item} />
      </div>
      {item.description && <p className="mt-1 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">{item.description}</p>}
      {item.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Dietary notes">
          {item.tags.map((tag) => (
            <li
              key={tag}
              title={TAGS[tag]?.label}
              className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent"
            >
              {TAGS[tag]?.short ?? tag}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Section({ section, headingLevel }: { section: MenuSection; headingLevel: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-heading`} className="menu-section py-12 md:py-16">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+5.5rem)]">
            <Heading id={`${section.id}-heading`} className="display text-[clamp(1.9rem,3.6vw,2.75rem)]">
              {section.name}
            </Heading>
            {section.availability && (
              <p className="mt-3 inline-block rounded-site border border-accent/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-accent">
                {section.availability}
              </p>
            )}
            {section.description && <p className="mt-3 text-muted">{section.description}</p>}
            {section.note && <p className="mt-3 text-sm leading-relaxed text-muted">{section.note}</p>}
          </div>
        </header>
        <ul className="divide-y divide-line border-y border-line lg:col-span-8">
          {section.items.map((item) => (
            <Item key={item.name} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The whole menu, section by section. Real text (never a PDF), so it reads well on phones and in search results. */
export function MenuSections({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  return (
    <div className="divide-y divide-line">
      {menu.sections.map((section) => (
        <Section key={section.id} section={section} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

export function MenuFootnotes() {
  const tags = usedTags();
  return (
    <footer className="border-t border-line py-10 text-sm text-muted">
      {tags.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {tags.map((t) => (
            <div key={t.key} className="flex gap-2">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent">{t.short}</dt>
              {t.short !== t.label && <dd>{t.label}</dd>}
            </div>
          ))}
        </dl>
      )}
      {menu.notes.length > 0 && (
        <ul className="mt-6 grid max-w-3xl gap-2 leading-relaxed">
          {menu.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </footer>
  );
}
