export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  for (const part of document.cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === "ps_csrf") {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }

  return null;
}