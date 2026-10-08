import type { EmployeeSuccessionPortfolio } from "./employee-360.types";

export function EmployeeSuccessionPortfolioPanel({
	portfolio,
}: {
	portfolio?: EmployeeSuccessionPortfolio;
}) {
	const rows = [
		{ label: "Successor 1", assignment: portfolio?.successor1 },
		{ label: "Successor 2", assignment: portfolio?.successor2 },
	];

	return (
		<section className="employee-profile__panel employee-profile__panel--succession">
			<header>
				<i className="a-icon boschicon-bosch-ic-people" aria-hidden="true" />
				<h2>Succession portfolio</h2>
			</header>

			<table className="employee-succession-portfolio__table">
				<thead>
					<tr>
						<th scope="col">Successor</th>
						<th scope="col">JDID</th>
						<th scope="col">JDName</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ label, assignment }) => (
						<tr key={label}>
							<th scope="row">{label}</th>
							<td>{assignment?.jdId ?? ""}</td>
							<td>{assignment?.jdName ?? ""}</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
}
