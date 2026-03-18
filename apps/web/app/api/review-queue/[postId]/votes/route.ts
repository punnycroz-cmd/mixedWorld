import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  const { postId } = await params;
  const response = await fetch(apiUrl(`/review-queue/${postId}/votes`), {
    body: JSON.stringify({
      voter_user_id: sessionUser.id,
      vote_type: "open"
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
