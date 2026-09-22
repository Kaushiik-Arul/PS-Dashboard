import { connection } from "next/server";
import { getEmployee360 } from "@/features/employee-360/employee-360.api";
import { Employee360Dashboard } from "@/features/employee-360/Employee360Dashboard";
import type { Employee360Query } from "@/features/employee-360/employee-360.types";

type Employee360PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const queryKeys = [
  "search", "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export default async function Employee360Page({ searchParams }: Employee360PageProps) {
  await connection();
  const params = await searchParams;
  const query: Employee360Query = {};
  queryKeys.forEach((key) => {
    const value = params[key];
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue) query[key] = firstValue;
  });
  const data = await getEmployee360(query);
  const viewKey = queryKeys.map((key) => query[key] ?? "").join("|");
  return <Employee360Dashboard key={viewKey} data={data} activeQuery={query} />;
}
