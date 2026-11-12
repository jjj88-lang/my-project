import type { ProcessStep } from "@/content/process";

const TILT = ["lg:-rotate-[0.9deg]", "lg:rotate-[0.6deg]", "lg:-rotate-[0.4deg]", "lg:rotate-[0.9deg]", "lg:-rotate-[0.7deg]"];

/**
 * The process as a row of kitchen order tickets: perforated along the top, torn along the
 * bottom, numbered, and typed in monospace. On small screens they stack in order.
 */
export function Tickets({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="flex flex-wrap justify-center gap-x-5 gap-y-7">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={`ticket-wrap reveal w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.84rem)] xl:w-[calc(20%-1rem)] ${TILT[index % TILT.length]}`}
        >
          <article className="ticket flex h-full flex-col px-5 pt-7 text-ink">
            <header className="flex items-baseline justify-between gap-3 font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
              <span>
                Ticket <span className="nums text-accent">No. {String(index + 1).padStart(2, "0")}</span>
              </span>
              <span>{step.station}</span>
            </header>
            <hr className="dash-rule my-3.5" />
            <h3 className="display text-[1.5rem] leading-[1.1]">{step.title}</h3>
            <p className="mt-3 flex-1 font-mono text-[0.8rem] leading-[1.65] text-ink-soft [word-spacing:-0.14em]">
              {step.text}
            </p>
            <hr className="dash-rule my-3.5" />
            <p className="pb-6 font-mono text-[0.72rem] font-medium uppercase leading-relaxed tracking-[0.1em] text-ink">
              {step.meta}
            </p>
          </article>
        </li>
      ))}
    </ol>
  );
}
