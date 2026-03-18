export function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const record = entry as Record<string, unknown>;
        const message = typeof record.msg === "string" ? record.msg : null;
        const locationParts = Array.isArray(record.loc)
          ? record.loc.filter((part): part is string => typeof part === "string" && part !== "body")
          : [];

        if (!message) {
          return null;
        }

        return locationParts.length > 0 ? `${locationParts.join(".")}: ${message}` : message;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (detail && typeof detail === "object") {
    const message = (detail as Record<string, unknown>).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Request failed.";
}
