import { getAttritionRegister } from "@/features/attrition/attrition.api";
import type { AttritionQueryFilters } from "@/features/attrition/attrition.types";

const filterKeys = ["year", "separationType", "orgUnit", "range"] as const;

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters: AttritionQueryFilters = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return Response.json((await getAttritionRegister(filters)).filterOptions);
  } catch {
    return Response.json({ message: "Unable to load Attrition filter options" }, { status: 500 });
  }
}