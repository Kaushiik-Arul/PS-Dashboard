import { getAttritionRegister } from "@/features/attrition/attrition.api";
import type { AttritionQueryFilters } from "@/features/attrition/attrition.types";

const multiFilterKeys = ["year", "separationType", "orgUnit", "range"] as const;

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters: AttritionQueryFilters = {};
    multiFilterKeys.forEach((key) => {
      const values = searchParams.getAll(key).filter(Boolean);
      if (values.length) filters[key] = values;
    });
    return Response.json((await getAttritionRegister(filters)).filterOptions);
  } catch {
    return Response.json({ message: "Unable to load Attrition filter options" }, { status: 500 });
  }
}