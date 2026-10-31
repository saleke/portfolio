"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-page container">
      <p className="system-code">500</p>
      <p className="system-eyebrow">UNEXPECTED ERROR</p>
      <h1>Something interrupted the page.</h1>
      <p>Try the request again. If it still fails, return to the portfolio.</p>
      <div className="system-actions">
        <button className="button button-primary" type="button" onClick={reset}>Try again</button>
        <Link className="button button-secondary" href="/">Return home</Link>
      </div>
    </main>
  );
}
