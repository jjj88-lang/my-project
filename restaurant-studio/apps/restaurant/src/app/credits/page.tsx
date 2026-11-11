import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/PageHeader";
import { credits } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo Credits",
  robots: { index: false, follow: true },
};

export default function CreditsPage() {
  if (credits.length === 0) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Credits"
        title="Photo credits"
        intro="Photographs on this site are used under the licenses listed below. Thank you to the photographers."
      />
      <div className="container-site py-12 md:py-16">
        <ul className="grid max-w-4xl gap-px overflow-hidden rounded-site border border-line bg-line">
          {credits.map((c) => (
            <li key={c.file} className="bg-bg p-5">
              <p className="font-semibold">{c.title ?? c.file}</p>
              <p className="mt-1 text-[0.95rem] text-muted">
                {c.author} ·{" "}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="text-link">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
                {c.source && (
                  <>
                    {" · "}
                    <a href={c.source} target="_blank" rel="noopener noreferrer" className="text-link">
                      Source
                    </a>
                  </>
                )}
                {c.changes && <> · {c.changes}</>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
