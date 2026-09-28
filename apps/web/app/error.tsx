"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Workforce data could not be loaded</h1>
      <p>The request could not be completed. Try loading the dashboard again.</p>
      <button className="a-button a-button--primary" type="button" onClick={reset}>
        <span className="a-button__label">Reload dashboard</span>
      </button>
    </main>
  );
}