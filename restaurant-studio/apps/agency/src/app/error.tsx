"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="shell py-24 md:py-32">
      <div className="max-w-[40rem]">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display display-lg mt-5">
          This page did not <em>come out right.</em>
        </h1>
        <p className="lead mt-6 text-ink-soft">Trying again usually fixes it. If it does not, the home page will.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          {/* A full page load on purpose: after an error, client-side state may be broken. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn btn-ghost">
            Back to the home page
          </a>
        </div>
      </div>
    </section>
  );
}
