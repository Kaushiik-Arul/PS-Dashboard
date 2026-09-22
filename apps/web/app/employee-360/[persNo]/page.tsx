import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEmployee360 } from "@/features/employee-360/employee-360.api";
import { EmployeeProfileView } from "@/features/employee-360/EmployeeProfileView";

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

  const data = await getEmployee360({ search: persNo });
  const employee = data.employees.find((item) => item.persNo === persNo);
  if (!employee) notFound();

  const query = await searchParams;
  return <EmployeeProfileView employee={employee} returnTo={safeReturnPath(query.returnTo)} />;
}