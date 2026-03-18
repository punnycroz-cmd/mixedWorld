import { NextResponse } from "next/server";

import { apiUrl } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
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

  const response = await fetch(apiUrl("/posts"), {
    body: JSON.stringify({
      author_user_id: sessionUser.id,
      content: payload?.content ?? "",
      content_type: "text",
      visibility: "public",
      tags: []
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const text = await response.text();
  return new NextResponse(text, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    },
    status: response.status,
    statusText: response.statusText
  });
}
