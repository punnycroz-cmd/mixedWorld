import { NextResponse } from "next/server";

import { apiUrl, readApiError } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  let payload: { content?: string } | null = null;
  try {
    payload = (await request.json()) as { content?: string };
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const { id } = await params;
  const response = await fetch(apiUrl(`/posts/${id}/comments`), {
    body: JSON.stringify({
      author_user_id: sessionUser.id,
      content: payload?.content ?? ""
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
