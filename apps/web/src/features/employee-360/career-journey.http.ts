import { getCsrfToken } from "@/auth/csrf";
import type { CareerJourneyEvent, CareerJourneyInput } from "./employee-360.types";

async function request(persNo: string, path: string, init: RequestInit) {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/employee-360/${encodeURIComponent(persNo)}/career-journey${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The Career Journey request could not be completed.");
  }
  return response;
}

export const careerJourneyClient = {
  create(persNo: string, input: CareerJourneyInput) {
    return request(persNo, "", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<CareerJourneyEvent>);
  },
  update(persNo: string, id: string, input: CareerJourneyInput) {
    return request(persNo, `/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<CareerJourneyEvent>);
  },
  async delete(persNo: string, id: string) {
    await request(persNo, `/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};