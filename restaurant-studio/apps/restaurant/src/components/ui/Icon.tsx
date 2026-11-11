import type { ReactNode } from "react";

const PATHS = {
  phone: (
    <path d="M6.500 3.500h3l1.500 4-2 1.500a11 11 0 0 0 6 6l1.500-2 4 1.500v3a2 2 0 0 1-2.200 2A16.500 16.500 0 0 1 4.500 5.700a2 2 0 0 1 2-2.200Z" />
  ),
  pin: (
    <>
      <path d="M12 21.500s7-6.300 7-11.800a7 7 0 1 0-14 0c0 5.500 7 11.800 7 11.800Z" />
      <circle cx="12" cy="9.700" r="2.500" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 7.500V12l3 2" />
    </>
  ),
  arrow: <path d="M4.500 12h15m-5.500-5.500 5.500 5.500-5.500 5.500" />,
  external: <path d="M9 5.500H5.500v13h13V15M13 5.500h5.500V11M18.500 5.500 11 13" />,
  menu: <path d="M4 7.500h16M4 12h16M4 16.500h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronLeft: <path d="M14.500 5.500 8 12l6.500 6.500" />,
  chevronRight: <path d="M9.500 5.500 16 12l-6.500 6.500" />,
  bag: (
    <>
      <path d="M5.500 8.500h13l-1 11.500h-11l-1-11.500Z" />
      <path d="M9 8.500V7a3 3 0 0 1 6 0v1.500" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.500" width="16" height="14.500" rx="1.500" />
      <path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" />
    </>
  ),
  mail: (
    <>
      <rect x="3.500" y="5.500" width="17" height="13" rx="1.500" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  utensils: <path d="M7 3.500v7m-2.500-7v4a2.500 2.500 0 0 0 5 0v-4M7 10.500v10M16.500 3.500c-2 1.500-3 4-3 7h3m0-7v17" />,
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.500" />
      <circle cx="12" cy="12" r="3.700" />
      <circle cx="16.700" cy="7.300" r="0.600" fill="currentColor" />
    </>
  ),
  facebook: <path d="M13.500 20.500v-7h2.700l.5-3.200h-3.200V8.500c0-1 .4-1.700 1.800-1.700h1.500V4a15 15 0 0 0-2.400-.2c-2.500 0-4.100 1.500-4.100 4.200v2.300H7.500v3.200h2.800v7" />,
  tiktok: <path d="M14 4v10.500a3.500 3.500 0 1 1-3.500-3.500M14 4c.4 2.600 2 4.200 4.500 4.500" />,
  star: <path d="m12 4 2.400 5 5.400.7-4 3.800 1 5.400-4.800-2.700-4.800 2.700 1-5.400-4-3.800 5.400-.7L12 4Z" />,
  gift: (
    <>
      <rect x="4" y="9.500" width="16" height="10.500" rx="1" />
      <path d="M3 9.500h18V6.500H3v3ZM12 6.500V20M12 6.500C10.500 3 7 3.500 7.500 5.500s3 1 4.500 1Zm0 0c1.500-3.500 5-3 4.500-1s-3 1-4.500 1Z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "size-5",
  strokeWidth = 1.5,
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
