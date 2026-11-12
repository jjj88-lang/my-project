"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";

import type { GalleryImage } from "./galleryImages";

/**
 * Photo grid with a full-screen viewer. The viewer is a native <dialog>, which gives
 * focus trapping, Escape to close and a backdrop for free. Arrow keys move between photos.
 */
export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + count) % count)),
    [count],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index === null ? null : images[index];

  return (
    <>
      <ul className="columns-2 gap-3 md:columns-3 md:gap-4 [&>li]:mb-3 md:[&>li]:mb-4">
        {images.map((img, i) => (
          <li key={img.src} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full overflow-hidden rounded-site bg-surface"
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                sizes="(min-width: 768px) 33vw, 50vw"
                placeholder={img.blurDataURL ? "blur" : "empty"}
                blurDataURL={img.blurDataURL}
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="sr-only">View larger</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIndex(null);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white open:flex open:flex-col"
      >
        {current && index !== null && (
          <>
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <p className="nums text-sm text-white/70" aria-live="polite">
                Photo {index + 1} of {count}
              </p>
              <button type="button" onClick={() => setIndex(null)} className="grid size-11 place-items-center">
                <Icon name="close" className="size-6" />
                <span className="sr-only">Close photo viewer</span>
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
              <button type="button" onClick={() => step(-1)} className="grid size-11 place-items-center rounded-full border border-white/30">
                <Icon name="chevronLeft" />
                <span className="sr-only">Previous photo</span>
              </button>
              <p className="text-center text-sm text-white/85">{current.caption ?? current.alt}</p>
              <button type="button" onClick={() => step(1)} className="grid size-11 place-items-center rounded-full border border-white/30">
                <Icon name="chevronRight" />
                <span className="sr-only">Next photo</span>
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
