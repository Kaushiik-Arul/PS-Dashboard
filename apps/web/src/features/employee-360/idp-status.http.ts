import { getCsrfToken } from "@/auth/csrf";
import type { EmployeeIdpStatus } from "./employee-360.types";

export type IdpStatusInput = {
  available: boolean;
  comments: string | null;
};

export async function updateIdpStatus(
  persNo: string,
  input: IdpStatusInput,
): Promise<EmployeeIdpStatus> {
  const csrfToken = getCsrfToken();
  const response = await fetch(
    `/api/employee-360/${encodeURIComponent(persNo)}/idp-status`,
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
    throw new Error(body?.message ?? "IDP status could not be updated.");
  }
  return response.json() as Promise<EmployeeIdpStatus>;
}