import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/auth/server-session";
import { hasPermission } from "@/auth/permissions";
import { getEmployeeStatuses } from "@/features/hrbp-point/hrbp-point.api";
import { HrbpPointDashboard } from "@/features/hrbp-point/HrbpPointDashboard";

export default async function HrbpPointPage() {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Fhrbp-point");
  if (!hasPermission(user.role, "viewHrbpPoint")) redirect("/");

  const employeeStatuses = await getEmployeeStatuses();
  return <HrbpPointDashboard initialRows={employeeStatuses} />;
}