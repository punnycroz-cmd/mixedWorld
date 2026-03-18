import "server-only";

import { formatApiErrorDetail } from "@/lib/error-detail";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

export const apiRoot = `${apiBaseUrl}/api/v1`;

interface ApiErrorPayload {
  detail?: unknown;
}

export function apiUrl(path: string): string {
  return `${apiRoot}${path}`;
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), {
      cache: "no-store",
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(6000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(`Backend API timed out at ${apiBaseUrl}.`);
    }

    throw new Error(`Could not reach backend API at ${apiBaseUrl}.`);
  }
}

export async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload.detail) {
      return formatApiErrorDetail(payload.detail);
    }
  } catch {
    // Ignore non-JSON errors.
  }

  return `Request failed with ${response.status}`;
}
