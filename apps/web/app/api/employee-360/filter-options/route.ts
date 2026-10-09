import { getEmployee360 } from "@/features/employee-360/employee-360.api";
import type { Employee360Query } from "@/features/employee-360/employee-360.types";

const filterKeys = [
  "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query: Employee360Query = {};
    const search = searchParams.get("search");
    if (search) query.search = search;
    filterKeys.forEach((key) => {
      const values = searchParams.getAll(key).filter(Boolean);
      if (values.length) query[key] = values;
    });
    return Response.json((await getEmployee360(query)).filterOptions);
  } catch {
    return Response.json(
      { message: "Unable to load Employee 360 filter options" },
      { status: 500 },
    );
  }
}