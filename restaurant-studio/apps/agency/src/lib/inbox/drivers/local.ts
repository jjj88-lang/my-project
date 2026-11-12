import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildPreview } from "../messages";
import type { Business, Delivery, Submission } from "../types";

/**
 * Local driver, for development. Records each inquiry as a line in data/inbox/<kind>.jsonl and
 * writes the two emails to data/outbox/ as text files, so the whole flow can be checked on a
 * laptop without any accounts. Do not use in production: serverless hosts have no lasting disk.
 */
export async function deliverLocal(submission: Submission, business: Business, dir: string): Promise<Delivery> {
  try {
    const preview = buildPreview(submission, business);
    const inbox = path.join(dir, "inbox");
    const outbox = path.join(dir, "outbox");
    await mkdir(inbox, { recursive: true });
    await mkdir(outbox, { recursive: true });

    await appendFile(path.join(inbox, `${submission.kind}.jsonl`), `${JSON.stringify({ ...submission, row: preview.row })}\n`);

    const asFile = (m: typeof preview.ownerEmail) =>
      [`To: ${m.to}`, m.replyTo ? `Reply-To: ${m.replyTo}` : null, `Subject: ${m.subject}`, "", m.text, ""]
        .filter((l) => l !== null)
        .join("\n");
    await writeFile(path.join(outbox, `${submission.id}-owner.txt`), asFile(preview.ownerEmail));
    await writeFile(path.join(outbox, `${submission.id}-customer.txt`), asFile(preview.customerEmail));

    return { ok: true, driver: "local" };
  } catch (err) {
    return { ok: false, driver: "local", error: err instanceof Error ? err.message : String(err) };
  }
}
