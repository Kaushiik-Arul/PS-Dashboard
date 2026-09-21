import "server-only";
import {
  employeeStatusTypes,
  type CreateEmployeeStatusInput,
  type EmployeeStatus,
  type EmployeeStatusInput,
} from "./hrbp-point.types";

type JsonRecord = Record<string, unknown>;

export class EmployeeStatusApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_BASE_URL is required in production");
    }
    return "http://127.0.0.1:3001/api/v1";
  }

  const url = new URL(configuredUrl);
  if (url.username || url.password) {
    throw new Error("API_BASE_URL must not contain credentials");
  }
  return url.toString().replace(/\/$/, "");
}

function requireRecord(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Employee status API returned an invalid response");
  }
  return value as JsonRecord;
}

function parseEmployeeStatus(value: unknown): EmployeeStatus {
  const row = requireRecord(value);
  if (
    typeof row.persNo !== "string" ||
    typeof row.statusType !== "string" ||
    !employeeStatusTypes.includes(row.statusType as never) ||
    (row.startDate !== null && typeof row.startDate !== "string") ||
    (row.endDate !== null && typeof row.endDate !== "string") ||
    typeof row.updatedAt !== "string" ||
    typeof row.updatedBy !== "string"
  ) {
    throw new Error("Employee status API returned an invalid record");
  }

  return row as unknown as EmployeeStatus;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    let message = "Employee status request failed";
    try {
      const body = requireRecord(await response.json());
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the generic message when the upstream response is not JSON.
    }
    throw new EmployeeStatusApiError(message, response.status);
  }

  return response;
}

export async function getEmployeeStatuses(): Promise<EmployeeStatus[]> {
  const response = await request("/hrbp-point/employee-statuses");
  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    throw new Error("Employee status API returned an invalid response");
  }
  return body.map(parseEmployeeStatus);
}

export async function createEmployeeStatus(
  input: CreateEmployeeStatusInput,
): Promise<EmployeeStatus> {
  const response = await request("/hrbp-point/employee-statuses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseEmployeeStatus(await response.json());
}

export async function updateEmployeeStatus(
  persNo: string,
  input: EmployeeStatusInput,
): Promise<EmployeeStatus> {
  const response = await request(
    `/hrbp-point/employee-statuses/${encodeURIComponent(persNo)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return parseEmployeeStatus(await response.json());
}

export async function deleteEmployeeStatus(persNo: string): Promise<void> {
  await request(`/hrbp-point/employee-statuses/${encodeURIComponent(persNo)}`, {
    method: "DELETE",
  });
}