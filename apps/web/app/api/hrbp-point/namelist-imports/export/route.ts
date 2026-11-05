import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardNamelistRequest("/export", {
      method: "POST",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      body: await request.text(),
    });
    const headers = new Headers();
    ["content-type", "content-length", "content-disposition"].forEach((name) => {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    });
    headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return namelistErrorResponse(error, "Unable to export the Namelist");
  }
}