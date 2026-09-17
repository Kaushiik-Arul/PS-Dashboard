import { getOverview } from "@/features/overview/overview.api";
import { OverviewDashboard } from "@/features/overview/OverviewDashboardView";

export default async function OverviewPage() {
  const overview = await getOverview();
  return <OverviewDashboard data={overview} />;
}