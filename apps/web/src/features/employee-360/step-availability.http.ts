import { getCsrfToken } from "@/auth/csrf";
import type { EmployeeStepAvailability } from "./employee-360.types";

export type StepAvailabilityInput = {
  available: boolean;
  preferences: string | null;
  comments: string | null;
};

export async function updateStepAvailability(
  persNo: string,
  input: StepAvailabilityInput,
): Promise<EmployeeStepAvailability> {
  const csrfToken = getCsrfToken();
  const response = await fetch(
    `/api/employee-360/${encodeURIComponent(persNo)}/step-availability`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "STEP availability could not be updated.");
  }
  return response.json() as Promise<EmployeeStepAvailability>;
}