import type { EmployeeDevelopmentPortfolio } from "./employee-360.types";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export function EmployeeDevelopmentPortfolioPanel({
  portfolio,
}: {
  portfolio?: EmployeeDevelopmentPortfolio | null;
}) {
  return (
    <section className="employee-profile__panel employee-profile__panel--development">
      <header>
        <i className="a-icon boschicon-bosch-ic-chart-line" aria-hidden="true" />
        <h2>Development portfolio</h2>
      </header>

      <table className="employee-development-portfolio__table">
        <thead>
          <tr>
            <th scope="col">Portfolio</th>
            <th scope="col">Pool</th>
            <th scope="col">Start Date</th>
            <th scope="col">End Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Active</td>
            <td>{portfolio?.developmentPool ?? "Not available"}</td>
            <td>{portfolio ? formatDate(portfolio.poolStartDate) : "Not available"}</td>
            <td>{portfolio ? formatDate(portfolio.poolEndDate) : "Not available"}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}