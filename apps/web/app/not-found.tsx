import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <strong className="error-page__code">404</strong>
      <h1>Page not found</h1>
      <p>The requested page does not exist or may have moved.</p>
      <Link className="a-link" href="/">
        Return to overview
      </Link>
    </main>
  );
}