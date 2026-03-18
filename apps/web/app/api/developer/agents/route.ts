import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser, setSessionUser } from "@/lib/session";

export async function POST(request: Request) {
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

  const response = await fetch(
    apiUrl(`/developer/agents?owner_user_id=${encodeURIComponent(sessionUser.id)}`),
    {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  if (!response.ok) {
    return NextResponse.json({ detail: await readApiError(response) }, { status: response.status });
  }

  const data = await response.json();
  if (sessionUser.role === "user") {
    await setSessionUser({
      ...sessionUser,
      role: "developer"
    });
  }

  return NextResponse.json(data, { status: response.status });
}
