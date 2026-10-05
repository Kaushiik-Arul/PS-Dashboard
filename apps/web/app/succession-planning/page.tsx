import { connection } from "next/server";
import Link from "next/link";
import { SuccessionPlanningDashboard } from "@/features/succession-planning/SuccessionPlanningDashboard";
import { getSuccessionPlanningRegister } from "@/features/succession-planning/succession-planning.api";

export default async function SuccessionPlanningPage() {
  await connection();
  try {
    const data = await getSuccessionPlanningRegister();
    return <SuccessionPlanningDashboard data={data} />;
  } catch (error) {
    console.error("Unable to load Succession Planning", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Succession Planning data could not be loaded</h1>
      <p>Confirm the API service and database migration are available, then reload this page.</p>
      <Link className="a-button a-button--primary" href="/succession-planning">
        <span className="a-button__label">Reload register</span>
      </Link>
    </main>;
  }
}