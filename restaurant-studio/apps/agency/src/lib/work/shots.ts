/**
 * The screenshots in public/work, decided once at build time.
 *
 * `import.meta.glob` is resolved by the bundler: whatever PNG files are in the folder when the
 * site is built become static imports (with their real width, height and a blur placeholder),
 * and a file that is not there is simply absent. Pages ask for a shot by name and leave out
 * whatever comes back undefined, so the site builds and reads properly with any subset of images.
 *
 * File names are fixed by scripts/capture-work.cjs: <demo>-<page>-<desktop|mobile>.png
 */
import type { StaticImageData } from "next/image";

import type { DemoKey } from "@/lib/demos";

const files = import.meta.glob<StaticImageData>("*.png", {
  base: "../../../public/work",
  eager: true,
  import: "default",
});

const byName = new Map<string, StaticImageData>(
  Object.entries(files).map(([file, image]) => [file.replace(/^\.\//, "").replace(/\.png$/, ""), image]),
);

export type ShotPage = "home" | "menu" | "catering" | "visit";
export type ShotDevice = "desktop" | "mobile";

export function shot(demo: DemoKey, page: ShotPage, device: ShotDevice): StaticImageData | undefined {
  return byName.get(`${demo}-${page}-${device}`);
}

/** A sample is shown only when at least one of its home page screenshots exists. */
export function demoHasShots(demo: DemoKey): boolean {
  return Boolean(shot(demo, "home", "desktop") ?? shot(demo, "home", "mobile"));
}

export const availableShots: string[] = [...byName.keys()].sort();
