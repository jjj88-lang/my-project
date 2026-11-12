import { buildPreview } from "@/lib/inbox/messages";
import type { Business, EmailMessage, Submission } from "@/lib/inbox/types";

/**
 * What happens after a guest sends a catering request, shown with the real thing.
 *
 * The spreadsheet row and both emails below are produced by the same library the live sites
 * use (src/lib/inbox), from a made-up request. Nothing here is a mock-up of the wording:
 * if the templates change, this section changes with them.
 */

const sampleRestaurant: Business = {
  name: "Hibana",
  phone: "(785) 555-0142",
  address: "1200 Sample Street, Topeka, KS 66603",
  ownerEmail: "owner@hibana.example",
};

const sampleRequest: Submission = {
  id: "CAT-20261111-7F3K",
  kind: "catering",
  kindLabel: "Catering inquiry",
  submittedAt: "2026-11-11T20:05:00.000Z",
  submittedAtLocal: "Wed, Nov 11, 2026 at 2:05 PM",
  source: "hibana.example",
  customer: { name: "Jordan Rivera", email: "jordan@example.com" },
  summary: "Sat, Dec 12, 2026 · 40 guests",
  ackSummary: " for Saturday, December 12, 2026 (40 guests)",
  fields: [
    { label: "Your name", value: "Jordan Rivera" },
    { label: "Email", value: "jordan@example.com" },
    { label: "Phone", value: "(785) 555-0199" },
    { label: "Event date", value: "2026-12-12" },
    { label: "Number of guests", value: "40" },
    { label: "Type of service", value: "On-site hibachi chef" },
    { label: "Anything else we should know?", value: "Birthday dinner. Two vegetarians." },
  ],
};

const preview = buildPreview(sampleRequest, sampleRestaurant);

/** The sentence in the acknowledgment that matters most. It is set in bold when found. */
const KEY_SENTENCE = "It is not a confirmation of your event, availability or pricing.";

function EmailCard({ email, from, highlight }: { email: EmailMessage; from: string; highlight?: string }) {
  const [before, after] = highlight && email.text.includes(highlight) ? email.text.split(highlight) : [email.text, null];
  return (
    <div className="overflow-hidden rounded-lg border border-rule-on-band bg-card text-ink">
      <dl className="grid gap-1 border-b border-rule bg-paper-deep px-4 py-3 font-mono text-[0.74rem] leading-relaxed">
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-ink-soft">From</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{from}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-ink-soft">To</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{email.to}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-14 shrink-0 text-ink-soft">Subject</dt>
          <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">{email.subject}</dd>
        </div>
      </dl>
      <p className="whitespace-pre-wrap px-4 py-4 text-[0.9rem] leading-relaxed [overflow-wrap:anywhere]">
        {before}
        {after !== null && (
          <>
            <strong className="font-semibold text-accent">{highlight}</strong>
            {after}
          </>
        )}
      </p>
    </div>
  );
}

function SheetCard() {
  const rows = Object.entries(preview.row).filter(([, value]) => value !== "");
  return (
    <div className="overflow-hidden rounded-lg border border-rule-on-band bg-card text-ink">
      <table className="w-full border-collapse text-left text-[0.88rem]">
        <caption className="sr-only">The new row in the restaurant&apos;s spreadsheet, one line per column</caption>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-rule last:border-0">
              <th scope="row" className="w-[42%] bg-paper-deep px-3 py-2 align-top font-mono text-[0.74rem] font-medium">
                {label}
              </th>
              <td className="px-3 py-2 align-top [overflow-wrap:anywhere]">
                {label === "Status" ? (
                  <span className="inline-block rounded-full border border-success px-2 font-mono text-[0.72rem] font-medium uppercase tracking-[0.08em] text-success">
                    {value}
                  </span>
                ) : (
                  value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-rule bg-paper-deep px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        Sheet tab: <span className="font-medium text-ink">{preview.sheet}</span>
      </p>
    </div>
  );
}

const STEPS = [
  {
    title: "Recorded",
    text: "A new row is added to a Google Sheet that belongs to the restaurant, with the status set to New. Nothing lives in a system only the studio can reach.",
    body: <SheetCard />,
  },
  {
    title: "Owner notified",
    text: "The owner gets an email with every detail. Replying to it answers the customer directly.",
    body: <EmailCard email={preview.ownerEmail} from="Website inquiries" />,
  },
  {
    title: "Customer acknowledged",
    text: "The customer gets a short note saying the request arrived. It confirms nothing: no date, no price, no availability.",
    body: <EmailCard email={preview.customerEmail} from="The restaurant" highlight={KEY_SENTENCE} />,
  },
];

export function BehindTheScenes() {
  return (
    <ol className="grid gap-10 lg:grid-cols-3 lg:gap-7">
      {STEPS.map((step, index) => (
        <li key={step.title} className="reveal flex flex-col">
          <p className="eyebrow nums">Step {String(index + 1).padStart(2, "0")}</p>
          <h3 className="display display-sm mt-2">{step.title}</h3>
          <p className="mb-5 mt-2 text-[0.98rem] text-on-band-soft">{step.text}</p>
          {step.body}
        </li>
      ))}
    </ol>
  );
}
