export function formatDirectOrIndirect(value: unknown): string {
  if (typeof value !== "string") return value == null ? "" : String(value);

  const normalized = value.trim().toUpperCase();
  if (normalized === "D") return "Direct";
  if (normalized === "I") return "Indirect";
  return value;
}