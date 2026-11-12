import { exampleCheck, money, type GuestCheck as Check } from "@/lib/pricing";
import { studio } from "@/lib/studio";

/**
 * An example project added up like a guest check. The lines and totals are computed from
 * pricing.json (see guestCheck() in src/lib/pricing.ts), so the arithmetic cannot drift
 * from the price list.
 */
export function GuestCheck({ check = exampleCheck }: { check?: Check }) {
  return (
    <div className="ticket-wrap mx-auto w-full max-w-[23rem]">
      <div className="check relative px-6 pb-10 pt-8 font-mono text-[0.86rem] leading-relaxed text-ink sm:px-7">
        <p className="text-center text-[0.68rem] font-medium uppercase tracking-[0.26em] text-ink-soft">Guest check</p>
        <p className="display mt-2 text-center text-[1.7rem] leading-none">{studio.name}</p>
        <p className="mt-2 text-center text-[0.72rem] uppercase tracking-[0.14em] text-ink-soft">Example project</p>

        {/* A rubber stamp, so nobody mistakes the example for a bill. */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-[4.6rem] rotate-[-9deg] rounded-[0.3rem] border-2 border-accent px-2 py-0.5 text-[0.66rem] font-medium uppercase tracking-[0.2em] text-accent"
        >
          Example
        </p>

        <hr className="dash-rule my-5" />

        <table className="w-full border-collapse">
          <caption className="sr-only">
            Example project: what is ordered, the total, and when each half is due
          </caption>
          <tbody>
            {check.lines.map((line) => (
              <tr key={line.name}>
                <th scope="row" className="py-1 pr-3 text-left align-top font-normal">
                  <span className="nums mr-2 text-ink-soft">1</span>
                  {line.name}
                </th>
                <td className="nums whitespace-nowrap py-1 text-right align-top">{money(line.price)}</td>
              </tr>
            ))}
          </tbody>
          <tbody>
            <tr>
              <td colSpan={2} className="py-0">
                <hr className="dash-rule my-4" />
              </td>
            </tr>
            <tr className="text-[1.02rem] font-medium">
              <th scope="row" className="py-1 pr-3 text-left font-medium">
                Total
              </th>
              <td className="nums whitespace-nowrap py-1 text-right">{money(check.total)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-1 pr-3 text-left font-normal text-ink-soft">
                Due to start ({check.depositPercent}%)
              </th>
              <td className="nums whitespace-nowrap py-1 text-right">{money(check.dueToStart)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-1 pr-3 text-left font-normal text-ink-soft">
                Due at approval ({check.balancePercent}%)
              </th>
              <td className="nums whitespace-nowrap py-1 text-right">{money(check.dueAtApproval)}</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <td colSpan={2} className="py-0">
                <hr className="dash-rule my-4" />
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-1 pr-3 text-left align-top font-normal">
                <span className="block text-[0.72rem] uppercase tracking-[0.12em] text-ink-soft">
                  Afterwards, only if you want it
                </span>
                {check.monthly.name}
              </th>
              <td className="nums whitespace-nowrap py-1 text-right align-bottom">
                {money(check.monthly.price)}
                <span className="text-ink-soft">/mo</span>
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="dash-rule my-5" />
        <p className="text-center text-[0.74rem] leading-relaxed text-ink-soft">
          Paid by card through Stripe. No card surcharge.
          <br />
          Thank you.
        </p>
      </div>
    </div>
  );
}
