/**
 * The launch checklist behind `npm run preflight` (scripts/preflight.ts prints it).
 *
 * Pure: it takes the studio file and the environment as input, so tests can try any combination.
 * A "block" item keeps the site from launching; a "note" is worth knowing but does not.
 */
import { cleanDemoUrl, DEMO_KEYS, DEMO_URL_VARS } from "@/lib/demos";
import { checkStripeLink, STRIPE_LINK_KEYS, STRIPE_LINK_VARS } from "@/lib/stripe-links";
import { isPlaceholder, type studio as studioValue } from "@/lib/studio";

export type CheckLevel = "ok" | "block" | "note";
export type CheckItem = { level: CheckLevel; text: string };
export type CheckGroup = { title: string; items: CheckItem[] };

type StudioFile = typeof studioValue;
type Env = Record<string, string | undefined>;

const ok = (text: string): CheckItem => ({ level: "ok", text });
const block = (text: string): CheckItem => ({ level: "block", text });
const note = (text: string): CheckItem => ({ level: "note", text });

function filled(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function studioChecks(studio: StudioFile): CheckGroup {
  const items: CheckItem[] = [];
  items.push(
    studio.nameIsTemporary
      ? block(`The name "${studio.name}" is marked temporary (nameIsTemporary: true).`)
      : ok(`Name: ${studio.name}`),
  );
  items.push(
    isPlaceholder(studio.url) || !/^https:\/\//.test(studio.url)
      ? block(`Site address is a placeholder (${studio.url || "empty"}). Search engines stay blocked until it is real.`)
      : ok(`Site address: ${studio.url}`),
  );
  items.push(
    isPlaceholder(studio.email) ? block(`Email is a placeholder (${studio.email || "empty"}).`) : ok(`Email: ${studio.email}`),
  );
  items.push(isPlaceholder(studio.phone) ? block("Phone number is empty.") : ok(`Phone: ${studio.phone}`));
  items.push(
    isPlaceholder(studio.mailingAddress)
      ? block("Mailing address is empty (business emails must carry a valid postal address).")
      : ok("Mailing address is set."),
  );
  items.push(isPlaceholder(studio.founder.name) ? block("Founder name is empty.") : ok(`Founder: ${studio.founder.name}`));
  const story = Array.isArray(studio.founder.story) ? studio.founder.story.join("") : studio.founder.story;
  items.push(isPlaceholder(story) ? block("Founder story is empty (the About page reads without it, but it should be yours).") : ok("Founder story is written."));
  items.push(
    studio.legalReviewed
      ? ok("Privacy and terms are marked as reviewed.")
      : block("Privacy policy and terms have not been reviewed (legalReviewed: false). Both pages show a draft notice."),
  );
  return { title: "Studio details (config/studio.json)", items };
}

export function environmentChecks(env: Env, studio: StudioFile): CheckGroup[] {
  const inbox: CheckItem[] = [];
  const googleReady = filled(env.INBOX_GOOGLE_URL) && filled(env.INBOX_GOOGLE_SECRET);
  if (googleReady) {
    inbox.push(
      /^https:\/\/script\.google\.com\//.test(env.INBOX_GOOGLE_URL!.trim())
        ? ok("INBOX_GOOGLE_URL and INBOX_GOOGLE_SECRET are set.")
        : note("INBOX_GOOGLE_URL is set but is not a script.google.com address. Check it is the web app URL."),
    );
  } else {
    inbox.push(
      block(
        "INBOX_GOOGLE_URL and INBOX_GOOGLE_SECRET are not both set. Without them the live contact form refuses requests.",
      ),
    );
  }
  if (env.INBOX_DRIVER?.trim() === "local") {
    inbox.push(block('INBOX_DRIVER is "local". That writes requests to this machine only; leave it empty for launch.'));
  }
  if (filled(env.FORM_SECRET) && env.FORM_SECRET!.trim().length < 32) {
    inbox.push(block("FORM_SECRET is set but shorter than 32 characters."));
  }

  const stripe: CheckItem[] = [];
  for (const key of STRIPE_LINK_KEYS) {
    const name = STRIPE_LINK_VARS[key];
    const check = checkStripeLink(env[name]);
    if (!check.ok) {
      stripe.push(
        check.reason === "empty"
          ? block(`${name} is not set.`)
          : block(`${name} is not an https://buy.stripe.com/ link, so it will not be shown.`),
      );
    } else if (check.link.testMode) {
      stripe.push(block(`${name} is a test-mode link. The live site hides test links; use a live one.`));
    } else {
      stripe.push(ok(`${name} is set.`));
    }
  }

  const demos: CheckItem[] = [];
  for (const key of DEMO_KEYS) {
    const name = DEMO_URL_VARS[key];
    const url = cleanDemoUrl(env[name]) ?? cleanDemoUrl(studio.demos[key].url);
    if (!url) demos.push(block(`${name} is not set (nor demos.${key}.url in studio.json). /work shows screenshots only.`));
    else if (!url.startsWith("https://")) demos.push(block(`${name} points at this machine (${url}). Use the deployed address.`));
    else demos.push(ok(`${studio.demos[key].name}: ${url}`));
  }

  return [
    { title: "Contact form inbox", items: inbox },
    { title: "Stripe Payment Links (/pay)", items: stripe },
    { title: "Live sample sites (/work)", items: demos },
  ];
}

export function screenshotChecks(available: string[]): CheckGroup {
  const items: CheckItem[] = DEMO_KEYS.map((key) =>
    available.some((name) => name.startsWith(`${key}-home-`))
      ? ok(`${key}: ${available.filter((name) => name.startsWith(`${key}-`)).length} screenshots`)
      : note(`${key}: no screenshots in public/work, so this sample is left out of /work. Run npm run capture.`),
  );
  return { title: "Screenshots (public/work)", items };
}

export function countBlockers(groups: CheckGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.filter((item) => item.level === "block").length, 0);
}
