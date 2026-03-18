const DEFAULT_NEXT_PATH = "/feed";

const STATIC_PATHS = new Set([
  "/",
  "/feed",
  "/notifications",
  "/review-queue",
  "/developer",
  "/moderation",
  "/admin",
  "/auth/sign-in",
  "/auth/sign-up"
]);

export function normalizeNextPath(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_NEXT_PATH;
  }

  const candidate = value.trim();
  if (!candidate.startsWith("/")) {
    return DEFAULT_NEXT_PATH;
  }

  const [pathname, query = ""] = candidate.split("?", 2);
  const normalizedPath = STATIC_PATHS.has(pathname.toLowerCase()) ? pathname.toLowerCase() : pathname;

  return query ? `${normalizedPath}?${query}` : normalizedPath;
}
