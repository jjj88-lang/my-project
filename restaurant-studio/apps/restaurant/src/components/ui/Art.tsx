import type { ReactNode } from "react";

import type { ArtMotif } from "@/lib/site/schema";

/**
 * Line-art motifs. They stand in for photography when a client has not supplied
 * photos yet, so a site never ships with grey boxes. All are drawn on a 120 x 120
 * grid with a single stroke weight and inherit the current text color.
 */
const MOTIFS: Record<ArtMotif, ReactNode> = {
  flame: (
    <>
      <path d="M60 10c4 18 27 29 27 56 0 21-12 38-27 38S33 89 33 70c0-12 6-21 13-27 0 10 4 15 8 15-2-15 0-32 6-48Z" />
      <path d="M60 62c4 9 12 13 12 23 0 10-5 17-12 17s-12-6-12-15c0-9 8-13 12-25Z" />
      <circle cx="82" cy="22" r="1.4" />
      <circle cx="38" cy="30" r="1" />
      <circle cx="90" cy="38" r="0.9" />
    </>
  ),
  nigiri: (
    <>
      <path d="M27 80c-2-10 4-16 13-17h42c9 1 15 7 13 17-1 6-5 8-11 8H38c-6 0-10-2-11-8Z" />
      <path d="M17 66c8-20 28-28 45-28 18 0 36 10 42 28 1 4-3 7-7 5-9-11-21-16-35-16s-28 5-37 16c-4 2-9-1-8-5Z" />
      <path d="M43 42c-4 6-6 12-6 18M60 38.5c-3 6-4 11-4 16.500M78 41.500c1 6 3 12 7 17" />
      <path d="M12 97h96" />
    </>
  ),
  maki: (
    <>
      <circle cx="45" cy="68" r="27" />
      <circle cx="45" cy="68" r="21.500" />
      <circle cx="39.500" cy="63" r="5.500" />
      <rect x="46.500" y="59" width="9.500" height="9.500" rx="2.200" />
      <circle cx="46" cy="76.500" r="4.200" />
      <circle cx="87" cy="47" r="19" />
      <circle cx="87" cy="47" r="14.500" />
      <circle cx="84" cy="44" r="4" />
      <circle cx="91.500" cy="50.500" r="3" />
      <path d="M14 104h92" />
    </>
  ),
  sake: (
    <>
      <path d="M43 16h16" />
      <path d="M45 16c0 11-3 15-7 23-6 12-8 22-8 36 0 14 8 23 21 23s21-9 21-23c0-14-2-24-8-36-4-8-7-12-7-23" />
      <path d="M30.500 68c12 5 29 5 41 0" />
      <path d="M80 72h25c0 14-4 24-12.500 24S80 86 80 72Z" />
      <path d="M88 99h9" />
    </>
  ),
  bowl: (
    <>
      <path d="M16 60h88c0 24-18 39-44 39S16 84 16 60Z" />
      <path d="M46 99l-2 6h32l-2-6" />
      <path d="M30 55l66-30M40 57l63-25" />
      <path d="M44 44c-4-6 4-10 0-18M60 40c-4-6 4-10 0-18" />
    </>
  ),
  grill: (
    <>
      <path d="M16 72l17-22h54l17 22H16Z" />
      <path d="M16 72v7h88v-7" />
      <path d="M28 79v13M92 79v13" />
      <ellipse cx="48" cy="62" rx="8.500" ry="3.600" />
      <ellipse cx="72" cy="64" rx="7.500" ry="3.200" />
      <path d="M56 56c4-3 9-2 10 2" />
      <path d="M60 14c2 8 10 11 10 19 0 6-4 10-10 10s-10-4-10-10c0-4 3-6 5-8 0 4 2 5 3 5-1-5 0-11 2-16Z" />
    </>
  ),
  rings: (
    <>
      <circle cx="60" cy="60" r="46" strokeDasharray="212 77" transform="rotate(-62 60 60)" />
      <circle cx="60" cy="60" r="33" strokeDasharray="152 55.300" transform="rotate(104 60 60)" />
      <circle cx="60" cy="60" r="20" strokeDasharray="92 33.700" transform="rotate(205 60 60)" />
      <circle cx="60" cy="60" r="2.400" />
    </>
  ),
  leaf: (
    <>
      <path d="M28 104c14-20 25-42 32-84" />
      <path d="M60 20c13 8 21 23 19 38-12-6-19-21-19-38Z" />
      <path d="M52 52c-12-6-23-4-31 4 10 6 23 4 31-4Z" />
      <path d="M43 76c12 0 23 6 27 16-12 2-23-4-27-16Z" />
    </>
  ),
  chopsticks: (
    <>
      <path d="M20 94l78-74M31 100l72-68" />
      <rect x="17" y="86" width="26" height="10" rx="5" transform="rotate(-12 30 91)" />
      <path d="M70 84h34c0 10-6 16-17 16s-17-6-17-16Z" />
    </>
  ),
  fish: (
    <>
      <path d="M14 60c14-22 46-26 70-8l20-12c-4 12-4 28 0 40L84 68c-24 18-56 14-70-8Z" />
      <circle cx="33" cy="56" r="2.200" />
      <path d="M46 45c4 9 4 21 0 30" />
      <path d="M58 41c4-6 12-8 17-6" />
      <path d="M60 80c5 4 11 4 15 2" />
    </>
  ),
  tongs: (
    <>
      <path d="M22 98c4-28 20-58 38-82" />
      <path d="M38 102c8-26 17-56 28-84" />
      <path d="M60 16c2-5 7-4 6 2" />
      <path d="M22 98c2 3 5 4 8 3M38 102c-3 1-6 0-8-1" />
      <path d="M64 74c6-6 14-2 20-6s13 2 13 8-7 9-13 11-14-3-20 1c-4-4-4-10 0-14Z" />
    </>
  ),
  cup: (
    <>
      <path d="M26 56h58c0 24-10 38-29 38S26 80 26 56Z" />
      <path d="M84 62c14-2 16 16-2 18" />
      <path d="M18 101h74" />
      <path d="M45 42c-4-6 4-10 0-18M62 42c-4-6 4-10 0-18" />
    </>
  ),
};

export function Art({
  motif,
  className,
  strokeWidth = 1.25,
}: {
  motif: ArtMotif;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {MOTIFS[motif]}
    </svg>
  );
}
