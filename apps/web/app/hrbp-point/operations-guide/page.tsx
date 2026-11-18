import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/auth/server-session";
import { hasPermission } from "@/auth/permissions";
import { HrbpOperationsGuide } from "@/features/hrbp-point/HrbpOperationsGuide";

export default async function HrbpOperationsGuidePage() {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Fhrbp-point%2Foperations-guide");
  if (!hasPermission(user.role, "viewHrbpPoint")) redirect("/");

  return <HrbpOperationsGuide />;
}
