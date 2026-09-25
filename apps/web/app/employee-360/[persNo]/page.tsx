import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEmployee360Profile } from "@/features/employee-360/employee-360.api";
import { EmployeeProfileView } from "@/features/employee-360/EmployeeProfileView";
import { getServerAuthUser } from "@/auth/server-session";

type EmployeeProfilePageProps = {
  params: Promise<{ persNo: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

function safeReturnPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  return path === "/employee-360" || path?.startsWith("/employee-360?")
    ? path
    : "/employee-360";
}

export default async function EmployeeProfilePage({
  params,
  searchParams,
}: EmployeeProfilePageProps) {
  await connection();
  const { persNo } = await params;
  if (!/^[1-9]\d*$/.test(persNo)) notFound();

  const [profile, user] = await Promise.all([getEmployee360Profile(persNo), getServerAuthUser()]);
  if (!profile) notFound();

  const query = await searchParams;
  return <EmployeeProfileView employee={profile.employee} careerJourney={profile.careerJourney} pppHistory={profile.pppHistory ?? []} canEditCareerJourney={user?.roles.includes("hrbp") ?? false} returnTo={safeReturnPath(query.returnTo)} />;
}