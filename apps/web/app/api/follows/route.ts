import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  let payload: { followingUserId?: string } | null = null;
  try {
    payload = (await request.json()) as { followingUserId?: string };
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const response = await fetch(apiUrl("/follows"), {
    body: JSON.stringify({
      follower_user_id: sessionUser.id,
      following_user_id: payload?.followingUserId ?? ""
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    return NextResponse.json({ detail: await readApiError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { status: response.status });
}
