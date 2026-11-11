import { photo, site } from "@/lib/site";

import { Art } from "@/components/ui/Art";

/** The client's logo image when supplied, otherwise a typeset wordmark with an optional line-art mark. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const image = photo(site.logo.image);
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos are small and often SVG; no optimization needed
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={site.logo.imageAlt ?? site.name}
        className={size === "lg" ? "h-14 w-auto" : "h-9 w-auto lg:h-10"}
      />
    );
  }

  return (
    <span className="flex items-center gap-2.5 text-ink">
      {site.logo.mark && (
        <Art motif={site.logo.mark} className={`${size === "lg" ? "size-10" : "size-7"} text-accent`} strokeWidth={1.7} />
      )}
      <span className={`wordmark ${size === "lg" ? "text-3xl" : "text-xl"}`}>{site.logo.text ?? site.name}</span>
    </span>
  );
}
