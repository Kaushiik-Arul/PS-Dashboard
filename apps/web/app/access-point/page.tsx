import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/auth/server-session";
import { hasPermission } from "@/auth/permissions";
import { getAccessPointData } from "@/features/access-point/access-point.api";
import { AccessPointDashboard } from "@/features/access-point/AccessPointDashboard";

export default async function AccessPointPage() {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Faccess-point");
  if (!hasPermission(user.role, "manageAccessPoint")) redirect("/");

  const data = await getAccessPointData();
  return <AccessPointDashboard {...data} />;
}
