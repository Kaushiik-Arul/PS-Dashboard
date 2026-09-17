export type StatusTone = "success" | "warning" | "error" | "neutral";

const successStatuses = new Set([
  "available",
  "active",
  "green",
  "good",
  "good match",
  "high",
  "yes",
]);

const warningStatuses = new Set([
  "under discussion",
  "planned",
  "potential match",
  "medium",
]);

const errorStatuses = new Set([
  "not available",
  "red",
  "red - not available",
  "no",
]);

export function getStatusTone(value: unknown): StatusTone {
  const normalizedValue = String(value).trim().toLowerCase();

  if (successStatuses.has(normalizedValue)) return "success";
  if (warningStatuses.has(normalizedValue)) return "warning";
  if (errorStatuses.has(normalizedValue)) return "error";

  return "neutral";
}