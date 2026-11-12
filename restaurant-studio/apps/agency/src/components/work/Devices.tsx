import Image, { type StaticImageData } from "next/image";

/**
 * Device frames drawn in CSS, holding real screenshots of the sample sites.
 * The screenshot keeps its own proportions, so a retake at a different size still fits.
 */
export function BrowserFrame({
  image,
  alt,
  address,
  sizes,
  preload = false,
  className = "",
}: {
  image: StaticImageData;
  alt: string;
  /** Shown in the address bar. Says plainly that this is a sample. */
  address: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`browser ${className}`}>
      <div className="browser-bar" aria-hidden="true">
        <span className="browser-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="browser-address">{address}</span>
      </div>
      <Image src={image} alt={alt} sizes={sizes} placeholder="blur" preload={preload} className="block h-auto w-full" />
    </div>
  );
}

export function PhoneFrame({
  image,
  alt,
  sizes,
  preload = false,
  className = "",
}: {
  image: StaticImageData;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">
        <Image src={image} alt={alt} sizes={sizes} placeholder="blur" preload={preload} className="block h-auto w-full" />
      </div>
    </div>
  );
}

/** The label that goes with every sample screenshot. */
export function SampleTag({ children, tone = "ink" }: { children?: React.ReactNode; tone?: "ink" | "on-band" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] ${
        tone === "on-band" ? "border-rule-on-band text-on-band" : "border-rule-strong bg-card text-ink"
      }`}
    >
      <span className={`size-1.5 rounded-full ${tone === "on-band" ? "bg-accent-on-band" : "bg-accent"}`} aria-hidden="true" />
      {children ?? "Sample concept, fictional restaurant"}
    </span>
  );
}
