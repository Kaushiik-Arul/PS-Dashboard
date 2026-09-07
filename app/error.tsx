"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dashboard-state -primary" role="alert">
      <i className="a-icon boschicon-bosch-ic-alert-error" aria-hidden="true" />
      <h1>Workforce data could not be loaded</h1>
      <p>Try loading the dashboard again.</p>
      <button className="a-button" type="button" onClick={reset}>
        <span className="a-button__label">Try again</span>
      </button>
    </main>
  );
}