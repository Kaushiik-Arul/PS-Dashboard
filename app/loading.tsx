export default function Loading() {
  return (
    <main className="dashboard-state -primary" role="status" aria-live="polite">
      <i className="a-icon boschicon-bosch-ic-hourglass" aria-hidden="true" />
      <h1>Loading workforce data</h1>
      <p>Please wait while the dashboard is prepared.</p>
    </main>
  );
}