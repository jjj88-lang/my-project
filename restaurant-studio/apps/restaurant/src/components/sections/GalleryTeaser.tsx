import Image from "next/image";
import Link from "next/link";

import { galleryImages } from "@/components/gallery/galleryImages";
import { Icon } from "@/components/ui/Icon";
import { isPremium, site } from "@/lib/site";

/** A small mosaic of photos on the home page. Hidden until the client has at least three photos. */
export function GalleryTeaser() {
  const images = galleryImages().slice(0, 5);
  if (images.length < 3) return null;

  return (
    <section className="border-t border-line py-20 md:py-28" aria-labelledby="gallery-teaser-heading">
      <div className="container-site">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2 id="gallery-teaser-heading" className="display mt-4 text-[clamp(2rem,4.4vw,3.5rem)]">
              {site.gallery.heading}
            </h2>
          </div>
          {isPremium && (
            <Link href="/gallery" className="link-arrow shrink-0 self-start md:self-auto">
              See all photos
              <Icon name="arrow" className="size-4" />
            </Link>
          )}
        </div>
        <ul className="mt-10 grid auto-rows-[9.5rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4 md:gap-4 lg:auto-rows-[16rem]">
          {images.map((img, i) => (
            <li
              key={img.src}
              className={`reveal relative overflow-hidden rounded-site bg-surface ${i === 0 ? "col-span-2 row-span-2" : ""} ${
                images.length === 4 && i === 3 ? "col-span-2" : ""
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                placeholder={img.blurDataURL ? "blur" : "empty"}
                blurDataURL={img.blurDataURL}
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
