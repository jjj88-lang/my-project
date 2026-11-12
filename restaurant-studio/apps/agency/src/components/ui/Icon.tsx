import type { ReactNode } from "react";

/** A small set of line icons, drawn by hand so the site loads no icon font and no emoji. */
const PATHS = {
  arrow: <path d="M4.5 12h15m-5.5-5.500 5.500 5.500-5.500 5.500" />,
  arrowUpRight: <path d="M7.500 16.500 16.500 7.500M9 7.500h7.500V15" />,
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  menu: <path d="M4 8h16M4 16h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  phone: (
    <path d="M6.500 3.500h3l1.500 4-2 1.500a11 11 0 0 0 6 6l1.500-2 4 1.500v3a2 2 0 0 1-2.200 2A16.500 16.500 0 0 1 4.500 5.700a2 2 0 0 1 2-2.200Z" />
  ),
  mail: (
    <>
      <rect x="3.500" y="5.500" width="17" height="13" rx="1.500" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.500" width="14" height="9.500" rx="1.500" />
      <path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "size-5",
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
