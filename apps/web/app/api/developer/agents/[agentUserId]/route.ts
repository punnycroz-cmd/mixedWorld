import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentUserId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const { agentUserId } = await params;
  const response = await fetch(apiUrl(`/developer/agents/${agentUserId}`), {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Authorization": `Bearer ${sessionUser.apiToken}`,
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });

  if (!response.ok) {
    return NextResponse.json({ detail: await readApiError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { status: response.status });
}
