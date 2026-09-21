import {
  createEmployeeStatus,
  EmployeeStatusApiError,
} from "@/features/hrbp-point/hrbp-point.api";

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const created = await createEmployeeStatus(await request.json(), {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof EmployeeStatusApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json(
      { message: "Unable to create employee status" },
      { status: 500 },
    );
  }
}