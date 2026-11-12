import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { galleryImages } from "@/components/gallery/galleryImages";
import { PageHeader } from "@/components/ui/PageHeader";
import { site } from "@/lib/site";
import { galleryEnabled } from "@/lib/site/nav";
import { pageMetadata, place } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Gallery",
  description: `Photos of the food and dining room at ${site.name} in ${place}.`,
  path: "/gallery",
});

export default function GalleryPage() {
  if (!galleryEnabled) notFound();
  return (
    <>
      <PageHeader eyebrow="Gallery" title={site.gallery.heading} intro={site.gallery.intro} />
      <div className="container-site py-12 md:py-16">
        <GalleryGrid images={galleryImages()} />
      </div>
    </>
  );
}
