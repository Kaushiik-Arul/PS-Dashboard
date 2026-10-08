import type { EmployeeDevelopmentPortfolio } from "./employee-360.types";
import { formatEmployeeDate } from "./employee-date";

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
            <th scope="row">Active</th>
            <td>{portfolio?.developmentPool ?? ""}</td>
            <td>{formatEmployeeDate(portfolio?.poolStartDate)}</td>
            <td>{formatEmployeeDate(portfolio?.poolEndDate)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}