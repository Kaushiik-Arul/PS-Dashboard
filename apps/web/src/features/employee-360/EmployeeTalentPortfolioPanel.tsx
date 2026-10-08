import type {
  EmployeeTalentPortfolio,
  EmployeeTalentPortfolioEntry,
} from "./employee-360.types";
import { formatEmployeeDate } from "./employee-date";

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
        <td />
        <td />
        <td />
      </>
    );
  }

  return (
    <>
      <td>{entry.type}</td>
      <td>{formatEmployeeDate(entry.startDate)}</td>
      <td>{formatDates
        ? formatEmployeeDate(entry.endDateOrAdmission)
        : formatEmployeeDate(entry.endDateOrAdmission, entry.endDateOrAdmission)}</td>
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