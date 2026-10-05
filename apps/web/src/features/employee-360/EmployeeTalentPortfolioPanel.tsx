import type {
  EmployeeTalentPortfolio,
  EmployeeTalentPortfolioEntry,
} from "./employee-360.types";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function PortfolioValue({
  entry,
  formatDates,
}: {
  entry: EmployeeTalentPortfolioEntry | null;
  formatDates: boolean;
}) {
  if (!entry) {
    return (
      <>
        <td className="employee-talent-portfolio__empty">Not available</td>
        <td className="employee-talent-portfolio__empty">Not available</td>
        <td className="employee-talent-portfolio__empty">Not available</td>
      </>
    );
  }

  return (
    <>
      <td>{entry.type}</td>
      <td>{entry.startDate ? formatDate(entry.startDate) : "Not available"}</td>
      <td>{formatDates ? formatDate(entry.endDateOrAdmission) : entry.endDateOrAdmission}</td>
    </>
  );
}

export function EmployeeTalentPortfolioPanel({
  portfolio,
}: {
  portfolio?: EmployeeTalentPortfolio;
}) {
  const values = portfolio ?? {
    active: null,
    passive: null,
    nomination: null,
  };

  return (
    <section className="employee-profile__panel employee-profile__panel--talent">
      <header>
        <i className="a-icon boschicon-bosch-ic-target" aria-hidden="true" />
        <h2>Talent portfolio</h2>
      </header>

      <table className="employee-talent-portfolio__table">
        <thead>
          <tr>
            <th scope="col">Portfolio</th>
            <th scope="col">Type</th>
            <th scope="col">Start Date</th>
            <th scope="col">End Date / Admission</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Active</th>
            <PortfolioValue entry={values.active} formatDates />
          </tr>
          <tr>
            <th scope="row">Passive</th>
            <PortfolioValue entry={values.passive} formatDates />
          </tr>
          <tr>
            <th scope="row">Nomination</th>
            <PortfolioValue entry={values.nomination} formatDates={false} />
          </tr>
        </tbody>
      </table>
    </section>
  );
}