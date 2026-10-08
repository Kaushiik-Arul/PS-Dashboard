import type { EmployeePppHistory } from './employee-360.types';

function valueOrBlank(value: string | null): string {
  return value?.trim() || '';
}

export function EmployeePppHistoryPanel({ history }: { history: EmployeePppHistory[] }) {
  return (
    <section className="employee-profile__panel employee-profile__panel--ppp">
      <header>
        <i className="a-icon boschicon-bosch-ic-chart-bar" aria-hidden="true" />
        <h2>Performance history</h2>
      </header>
      {history.length ? (
        <div className="employee-ppp-history__table-wrap">
          <table className="employee-ppp-history__table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Performance</th>
                <th scope="col">Position</th>
                <th scope="col">Person</th>
                <th scope="col">TCL</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  <td>{valueOrBlank(row.performance)}</td>
                  <td>{valueOrBlank(row.position)}</td>
                  <td>{valueOrBlank(row.person)}</td>
                  <td>{valueOrBlank(row.tcl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="employee-ppp-history__empty">No records available.</p>}
    </section>
  );
}
