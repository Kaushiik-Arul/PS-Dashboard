import "./coming-soon-page.css";

export function ComingSoonPage({
  title,
  icon,
}: {
  title: string;
  icon: string;
}) {
  return (
    <main className="coming-soon-page">
      <section aria-labelledby="coming-soon-title">
        <i className={`a-icon ${icon} coming-soon-page__icon`} aria-hidden="true" />
        <h1 id="coming-soon-title">{title}</h1>
        <p>Coming soon</p>
      </section>
    </main>
  );
}
