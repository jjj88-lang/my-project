import Image from "next/image";

import { photo } from "@/lib/site";
import type { ArtMotif, Media } from "@/lib/site/schema";

import { Art } from "./Art";

const FOCUS: Record<Media["focus"], string> = {
  center: "50% 50%",
  top: "50% 15%",
  bottom: "50% 85%",
  left: "20% 50%",
  right: "80% 50%",
};

/**
 * A photo slot. Shows the client's photo when there is one, and a designed
 * line-art panel when there is not, so layouts never depend on photography.
 * The parent sets the size (usually with an aspect-ratio class).
 */
export function MediaFrame({
  media,
  fallbackArt = "rings",
  sizes,
  preload = false,
  className = "",
  artClassName = "h-[60%] w-[60%]",
}: {
  media?: Media;
  fallbackArt?: ArtMotif;
  /** The rendered width at each breakpoint, e.g. "(min-width: 1024px) 33vw, 100vw". */
  sizes: string;
  preload?: boolean;
  className?: string;
  artClassName?: string;
}) {
  const image = photo(media?.image);

  if (image && media) {
    return (
      <div className={`relative overflow-hidden rounded-site bg-surface ${className}`}>
        <Image
          src={image}
          alt={media.alt ?? ""}
          fill
          sizes={sizes}
          preload={preload}
          placeholder={image.blurDataURL ? "blur" : "empty"}
          className="object-cover"
          style={{ objectPosition: FOCUS[media.focus] }}
        />
      </div>
    );
  }

  return (
    <div className={`art-panel rounded-site ${className}`} aria-hidden="true">
      <div className="pattern-waves absolute inset-0 opacity-[0.07]" />
      <div className="absolute inset-0 grid place-items-center">
        <Art motif={media?.art ?? fallbackArt} className={`art-motif text-accent ${artClassName}`} strokeWidth={1} />
      </div>
    </div>
  );
}
