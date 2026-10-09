import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasPermission } from "@/auth/permissions";
import { getServerAuthUser } from "@/auth/server-session";
import { CustomOverviewDashboard } from "@/features/custom-overview/CustomOverviewDashboard";
import { getCustomOverviewPreference } from "@/features/custom-overview/custom-overview.api";
import { getOverview } from "@/features/overview/overview.api";
import type { OverviewQueryFilters } from "@/features/overview/overview.types";
import { getSuccessionPlanningRegister } from "@/features/succession-planning/succession-planning.api";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterKeys = [
  "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export default async function OverviewPage({ searchParams }: Props) {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Foverview");
  if (!hasPermission(user.role, "viewCustomOverview")) redirect("/");

  const query = await searchParams;
  const filters: OverviewQueryFilters = {};
  filterKeys.forEach((key) => {
    const value = query[key];
    const values = (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
    if (values.length) filters[key] = values;
  });

  let demographics: Awaited<ReturnType<typeof getOverview>>;
  let succession: Awaited<ReturnType<typeof getSuccessionPlanningRegister>>;
  let preference: Awaited<ReturnType<typeof getCustomOverviewPreference>>;
  try {
    [demographics, succession, preference] = await Promise.all([
      getOverview(filters),
      getSuccessionPlanningRegister(filters),
      getCustomOverviewPreference(),
    ]);
  } catch (error) {
    console.error("Unable to load custom Overview", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Overview could not be loaded</h1>
      <p>Confirm the API service and dashboard preferences migration are available, then reload this page.</p>
      <Link className="a-button a-button--primary" href="/overview">
        <span className="a-button__label">Reload Overview</span>
      </Link>
    </main>;
  }
  const filterKey = filterKeys.map((key) => filters[key]?.join(",") ?? "").join("|");
  return (
    <CustomOverviewDashboard
      key={filterKey}
      demographics={demographics}
      succession={succession}
      preference={preference}
      activeFilters={filters}
    />
  );
}
