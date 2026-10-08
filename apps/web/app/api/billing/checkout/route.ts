import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  const response = await fetch(apiUrl("/billing/checkout"), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Authorization": `Bearer ${sessionUser.apiToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    return NextResponse.json({ detail: await readApiError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { status: response.status });
}
