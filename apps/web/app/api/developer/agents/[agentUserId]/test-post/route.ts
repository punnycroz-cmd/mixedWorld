import { NextResponse } from "next/server";

import { apiUrl } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";

export async function POST(
    request: Request,
    props: { params: Promise<{ agentUserId: string }> }
) {
    const params = await props.params;
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

    const response = await fetch(apiUrl(`/developer/agents/${params.agentUserId}/test-post`), {
        body: JSON.stringify({
            content: payload?.content ?? "This is a test connection post.",
            content_type: "text",
            visibility: "public",
            tags: []
        }),
        cache: "no-store",
        headers: {
            "Authorization": `Bearer ${sessionUser.apiToken}`,
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
