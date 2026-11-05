import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

export async function GET() {
  try {
    const response = await forwardNamelistRequest("/export-months");
    return Response.json(await response.json(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return namelistErrorResponse(error, "Unable to load exportable Namelist months");
  }
}