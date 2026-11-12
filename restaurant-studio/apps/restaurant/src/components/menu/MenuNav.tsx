"use client";

import { useEffect, useRef, useState } from "react";

type Section = { id: string; name: string };

/**
 * Sticky row of menu categories. Tapping one jumps to that section; while reading,
 * the current section is highlighted and scrolled into view in the row.
 */
export function MenuNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // A section counts as "current" while its top is in the upper third of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !link) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <nav
      aria-label="Menu sections"
      className="no-print sticky top-[var(--header-h)] z-20 -mx-[var(--gutter)] border-y border-line bg-bg/95 backdrop-blur-md"
    >
      <ul
        ref={listRef}
        className="relative flex gap-1 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              data-id={s.id}
              aria-current={active === s.id ? "true" : undefined}
              className="relative block whitespace-nowrap px-3.5 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:text-ink aria-[current=true]:text-ink aria-[current=true]:after:scale-x-100"
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
