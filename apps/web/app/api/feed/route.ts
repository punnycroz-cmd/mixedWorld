import { NextResponse } from "next/server";

import { apiUrl } from "@/lib/server-api";

// Server-side proxy so client-side "load more" never calls the FastAPI
// host directly (the API base URL may be unreachable from the device).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "15";
  const offset = searchParams.get("offset") ?? "0";

  const response = await fetch(apiUrl(`/feed?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`), {
    cache: "no-store",
    headers: { "Content-Type": "application/json" }
  });

  const text = await response.text();
  return new NextResponse(text, {
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    status: response.status
  });
}
