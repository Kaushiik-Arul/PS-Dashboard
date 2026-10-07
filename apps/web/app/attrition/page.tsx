import { connection } from "next/server";
import Link from "next/link";
import { AttritionDashboard } from "@/features/attrition/AttritionDashboard";
import { getAttritionRegister } from "@/features/attrition/attrition.api";
import type { AttritionQueryFilters } from "@/features/attrition/attrition.types";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const filterKeys = ["orgUnit", "range", "gender"] as const;

export default async function AttritionPage({ searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const filters: AttritionQueryFilters = {};
  filterKeys.forEach((key) => {
    const value = query[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) filters[key] = first;
  });
  try {
    const data = await getAttritionRegister(filters);
    const filterKey = filterKeys.map((key) => filters[key] ?? "").join("|");
    return <AttritionDashboard key={filterKey} data={data} activeFilters={filters} />;
  } catch (error) {
    console.error("Unable to load Attrition", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Attrition data could not be loaded</h1>
      <p>Confirm the API service and Attrition migration are available, then reload this page.</p>
      <Link className="a-button a-button--primary" href="/attrition"><span className="a-button__label">Reload register</span></Link>
    </main>;
  }
}