import { studio } from "@/lib/studio";

/**
 * The studio's name set as a wordmark: the first part in the display serif, the last word as a
 * small monospace label. It is built from studio.json, so a new name needs no design work.
 */
export function Wordmark({ size = "md", tone = "ink" }: { size?: "md" | "lg"; tone?: "ink" | "on-band" }) {
  const words = studio.name.trim().split(/\s+/);
  const tail = words.length > 1 ? words[words.length - 1] : "";
  const head = tail ? words.slice(0, -1).join(" ") : studio.name;

  return (
    <span className={`inline-flex items-baseline gap-2 ${tone === "on-band" ? "text-on-band" : "text-ink"}`}>
      <span
        className={`font-display font-[520] leading-none tracking-[-0.02em] ${size === "lg" ? "text-[2.1rem]" : "text-[1.55rem]"}`}
      >
        {head}
      </span>
      {tail && (
        <span
          className={`font-mono font-medium uppercase leading-none tracking-[0.16em] ${
            size === "lg" ? "text-[0.8rem]" : "text-[0.68rem]"
          } ${tone === "on-band" ? "text-accent-on-band" : "text-accent"}`}
        >
          {tail}
        </span>
      )}
    </span>
  );
}
