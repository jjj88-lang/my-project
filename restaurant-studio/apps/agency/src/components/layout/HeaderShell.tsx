"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import type { NavItem } from "@/lib/nav";

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

/**
 * The sticky header and the mobile menu.
 *
 * The menu is a native <dialog>: the browser traps focus inside it, closes it on Escape and
 * returns focus to the button that opened it. The header lives in the layout, which stays
 * mounted from page to page, so the menu is closed whenever the path changes.
 */
export function HeaderShell({
  logo,
  homeLabel,
  nav,
  contact,
  drawerFooter,
}: {
  logo: ReactNode;
  homeLabel: string;
  nav: NavItem[];
  contact: NavItem;
  drawerFooter: ReactNode;
}) {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const closeMenu = () => dialogRef.current?.close();

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className="no-print sticky top-0 z-40 h-[var(--header-h)] border-b border-transparent bg-paper transition-[border-color,box-shadow] duration-300 data-[scrolled=true]:border-rule data-[scrolled=true]:shadow-[0_10px_30px_-22px_rgba(27,24,20,0.55)]"
    >
      <div className="shell flex h-full items-center justify-between gap-6">
        <Link href="/" className="-ml-1 flex min-h-11 shrink-0 items-center px-1" aria-label={homeLabel}>
          {logo}
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="relative inline-flex min-h-11 items-center px-3.5 text-[0.98rem] font-medium text-ink transition-colors hover:text-accent aria-[current=page]:text-accent aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3.5 aria-[current=page]:after:bottom-1.5 aria-[current=page]:after:h-[1.5px] aria-[current=page]:after:bg-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href={contact.href} className="btn btn-primary btn-sm hidden sm:inline-flex">
            {contact.label}
          </Link>
          <button
            type="button"
            className="-mr-2 inline-flex min-h-11 items-center gap-2 px-2 font-mono text-[0.78rem] font-medium uppercase tracking-[0.14em] lg:hidden"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            Menu
            <Icon name="menu" className="size-6" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0 text-ink backdrop:bg-ink/70 open:flex open:flex-col"
      >
        <div className="shell flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-rule">
          <Link href="/" onClick={closeMenu} className="-ml-1 flex min-h-11 items-center px-1" aria-label={homeLabel}>
            {logo}
          </Link>
          <button
            type="button"
            className="-mr-2 inline-flex min-h-11 items-center gap-2 px-2 font-mono text-[0.78rem] font-medium uppercase tracking-[0.14em]"
            onClick={closeMenu}
          >
            Close
            <Icon name="close" className="size-6" />
          </button>
        </div>

        <div className="shell flex flex-1 flex-col overflow-y-auto pb-8 pt-4">
          <nav aria-label="Mobile">
            <ul>
              {nav.map((item, index) => (
                <li key={item.href} className="border-b border-rule">
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-16 items-baseline gap-4 py-3.5 aria-[current=page]:text-accent"
                  >
                    <span className="nums w-7 font-mono text-[0.74rem] font-medium tracking-[0.1em] text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="display text-[2rem]">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link href={contact.href} onClick={closeMenu} className="btn btn-primary mt-7 w-full">
            {contact.label}
            <Icon name="arrow" className="btn-arrow size-5" />
          </Link>

          <div className="mt-auto pt-8">{drawerFooter}</div>
        </div>
      </dialog>
    </header>
  );
}
