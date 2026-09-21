import { connection } from "next/server";
import { getOverview } from "@/features/overview/overview.api";
import { OverviewDashboard } from "@/features/overview/OverviewDashboardView";

export default async function OverviewPage() {
  await connection();
  const overview = await getOverview();
  return <OverviewDashboard data={overview} />;
}