import { connection } from "next/server";
import { getServerAuthUser } from "@/auth/server-session";
import { getEmployee360 } from "@/features/employee-360/employee-360.api";
import { Employee360Dashboard } from "@/features/employee-360/Employee360Dashboard";
import type { Employee360Query } from "@/features/employee-360/employee-360.types";

type Employee360PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const queryKeys = [
  "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export default async function Employee360Page({ searchParams }: Employee360PageProps) {
  await connection();
  const params = await searchParams;
  const query: Employee360Query = {};
  const search = params.search;
  const firstSearch = Array.isArray(search) ? search[0] : search;
  if (firstSearch) query.search = firstSearch;
  queryKeys.forEach((key) => {
    const value = params[key];
    const values = (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
    if (values.length) query[key] = values;
  });
  const [data, user] = await Promise.all([getEmployee360(query), getServerAuthUser()]);
  const viewKey = [query.search ?? "", ...queryKeys.map((key) => query[key]?.join(",") ?? "")].join("|");
  return <Employee360Dashboard key={viewKey} data={data} activeQuery={query} canViewSensitiveCareerDates={user?.roles.includes("hrbp") ?? false} />;
}
