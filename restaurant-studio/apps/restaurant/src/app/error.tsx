"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-24 md:py-32">
      <div className="container-site max-w-2xl text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">We dropped a plate.</h1>
        <p className="mx-auto mt-5 max-w-md text-muted">
          This page did not load properly. Trying again usually fixes it.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-solid">
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
