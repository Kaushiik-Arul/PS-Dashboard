import {
  deleteEmployeeStatus,
  EmployeeStatusApiError,
  updateEmployeeStatus,
} from "@/features/hrbp-point/hrbp-point.api";

type RouteContext = { params: Promise<{ persNo: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { persNo } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const updated = await updateEmployeeStatus(persNo, await request.json(), {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    });
    return Response.json(updated);
  } catch (error) {
    if (error instanceof EmployeeStatusApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json(
      { message: "Unable to update employee status" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { persNo } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await deleteEmployeeStatus(persNo, {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof EmployeeStatusApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json(
      { message: "Unable to delete employee status" },
      { status: 500 },
    );
  }
}