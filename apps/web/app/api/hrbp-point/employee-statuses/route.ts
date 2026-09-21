import {
  createEmployeeStatus,
  EmployeeStatusApiError,
} from "@/features/hrbp-point/hrbp-point.api";

export async function POST(request: Request) {
  try {
    const created = await createEmployeeStatus(await request.json());
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