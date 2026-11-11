"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";

type NavItem = { label: string; href: string };
type Action = { label: string; href: string; external: boolean };

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function ActionButton({ action, className, onClick }: { action: Action; className: string; onClick?: () => void }) {
  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {action.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={action.href} className={className} onClick={onClick}>
      {action.label}
    </Link>
  );
}

export function HeaderShell({
  logo,
  nav,
  order,
  reserve,
  phone,
  phoneHref,
  overlayOnHome,
  drawerFooter,
}: {
  logo: ReactNode;
  nav: NavItem[];
  order?: Action;
  reserve?: Action;
  phone: string;
  phoneHref: string;
  /** True when the home page hero is a full-bleed photo the header should sit on top of. */
  overlayOnHome: boolean;
  drawerFooter: ReactNode;
}) {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 12,
    () => false,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overlay = overlayOnHome && pathname === "/" && !scrolled;

  // The menu lives in the layout, which stays mounted across pages: close it whenever the route changes.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const closeMenu = () => dialogRef.current?.close();
  const primary = order ?? reserve;
  const secondary = order && reserve ? reserve : undefined;

  return (
    <header
      data-overlay={overlay ? "true" : "false"}
      className="no-print sticky top-0 z-40 h-[var(--header-h)] border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-[overlay=false]:border-line data-[overlay=false]:bg-bg/92 data-[overlay=false]:backdrop-blur-md"
    >
      <div className="container-site flex h-full items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Home">
          {logo}
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 xl:gap-10">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="relative py-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ink/85 transition-colors hover:text-accent aria-[current=page]:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={phoneHref}
            className="hidden items-center gap-2 text-sm font-medium text-ink/85 transition-colors hover:text-accent xl:flex"
          >
            <Icon name="phone" className="size-4" />
            <span className="nums">{phone}</span>
          </a>
          {secondary && <ActionButton action={secondary} className="btn btn-ghost btn-sm hidden md:inline-flex" />}
          {primary && <ActionButton action={primary} className="btn btn-solid btn-sm hidden sm:inline-flex" />}
          <button
            type="button"
            className="-mr-2 grid size-11 place-items-center lg:hidden"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            <Icon name="menu" className="size-6" />
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 text-ink backdrop:bg-black/80 open:flex open:flex-col"
      >
        <div className="container-site flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line">
          <Link href="/" onClick={closeMenu} className="flex items-center" aria-label="Home">
            {logo}
          </Link>
          <button type="button" className="-mr-2 grid size-11 place-items-center" onClick={closeMenu}>
            <Icon name="close" className="size-6" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <div className="container-site flex flex-1 flex-col overflow-y-auto pb-8 pt-6">
          <nav aria-label="Mobile">
            <ul>
              {nav.map((item) => (
                <li key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="display flex items-center justify-between py-4 text-[2rem] aria-[current=page]:text-accent"
                  >
                    {item.label}
                    <Icon name="arrow" className="size-5 text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 grid gap-3">
            {primary && <ActionButton action={primary} className="btn btn-solid w-full" onClick={closeMenu} />}
            {secondary && <ActionButton action={secondary} className="btn btn-ghost w-full" onClick={closeMenu} />}
            <a href={phoneHref} className="btn btn-ghost w-full">
              <Icon name="phone" className="size-4" />
              <span className="nums">Call {phone}</span>
            </a>
          </div>

          <div className="mt-auto pt-10 text-sm text-muted">{drawerFooter}</div>
        </div>
      </dialog>
    </header>
  );
}
