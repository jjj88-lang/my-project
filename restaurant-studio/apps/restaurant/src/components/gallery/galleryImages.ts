import "server-only";

import { photo, site } from "@/lib/site";

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
  caption?: string;
};

/** Gallery photos that actually exist on disk, flattened into plain data a client component can receive. */
export function galleryImages(): GalleryImage[] {
  return site.gallery.images.flatMap((g) => {
    const image = photo(g.image);
    if (!image) return [];
    return [{ src: image.src, width: image.width, height: image.height, blurDataURL: image.blurDataURL, alt: g.alt, caption: g.caption }];
  });
}
