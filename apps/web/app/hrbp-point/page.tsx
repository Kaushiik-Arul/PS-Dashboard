import { connection } from "next/server";
import { getEmployeeStatuses } from "@/features/hrbp-point/hrbp-point.api";
import { HrbpPointDashboard } from "@/features/hrbp-point/HrbpPointDashboard";

export default async function HrbpPointPage() {
  await connection();
  const employeeStatuses = await getEmployeeStatuses();
  return <HrbpPointDashboard initialRows={employeeStatuses} />;
}