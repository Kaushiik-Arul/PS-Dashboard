import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/auth/server-session";
import { hasPermission } from "@/auth/permissions";
import { OrgStructureView } from "@/features/org-structure/OrgStructureView";

export default async function OrgStructurePage() {
  await connection();
  const user = await getServerAuthUser();
  if (!user) redirect("/login?returnTo=%2Forg-structure");
  if (!hasPermission(user.role, "viewOrgStructure")) redirect("/");

  return <OrgStructureView />;
}
