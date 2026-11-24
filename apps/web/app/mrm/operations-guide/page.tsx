import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/auth/server-session";
import { hasPermission } from "@/auth/permissions";
import { MrmOperationsGuide } from "@/features/mrm/MrmOperationsGuide";

export default async function MrmOperationsGuidePage() {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Fmrm%2Foperations-guide");
  if (!hasPermission(user.role, "viewMrm")) redirect("/");

  return <MrmOperationsGuide />;
}
