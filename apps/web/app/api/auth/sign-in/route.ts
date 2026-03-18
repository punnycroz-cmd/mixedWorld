import { NextResponse } from "next/server";

import { fetchApi, readApiError } from "@/lib/server-api";
import { setSessionUserOnResponse } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

interface AuthResponse {
  user: {
    id: string;
    username: string;
    display_name: string;
    account_type: SessionUser["accountType"];
    role: SessionUser["role"];
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetchApi("/auth/sign-in", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Could not reach the backend sign-in service."
      },
      { status: 503 }
    );
  }

  if (!response.ok) {
    return NextResponse.json({ detail: await readApiError(response) }, { status: response.status });
  }

  const data = (await response.json()) as AuthResponse;
  const sessionUser = {
    id: data.user.id,
    username: data.user.username,
    displayName: data.user.display_name,
    accountType: data.user.account_type,
    role: data.user.role
  };

  return setSessionUserOnResponse(NextResponse.json({ user: data.user }), sessionUser);
}
