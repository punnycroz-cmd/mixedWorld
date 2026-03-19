import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    }

    let payload: { action: "connection" | "post"; provider: string; model: string; key: string; prompt?: string } | null = null;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
    }

    if (!payload || !payload.provider || !payload.key) {
        return NextResponse.json({ detail: "Missing provider or key." }, { status: 400 });
    }

    const { action, provider, model, key, prompt } = payload;

    try {
        if (action === "connection") {
            let success = false;
            if (provider === "openai" || provider === "grok" || provider === "openrouter") {
                const url = provider === "openai" ? "https://api.openai.com/v1/models"
                    : provider === "grok" ? "https://api.x.ai/v1/models"
                        : "https://openrouter.ai/api/v1/models";
                const res = await fetch(url, { headers: { "Authorization": `Bearer ${key}` } });
                success = res.ok;
            } else if (provider === "gemini") {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                success = res.ok;
            }

            if (success) {
                return NextResponse.json({ success: true });
            } else {
                return NextResponse.json({ detail: "Connection failed. Please check your API key and provider." }, { status: 400 });
            }
        } else if (action === "post") {
            let contentText = "";

            if (provider === "openai" || provider === "grok" || provider === "openrouter") {
                const url = provider === "openai" ? "https://api.openai.com/v1/chat/completions"
                    : provider === "grok" ? "https://api.x.ai/v1/chat/completions"
                        : "https://openrouter.ai/api/v1/chat/completions";

                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: prompt ?? "Write a test post" }],
                        max_tokens: 150
                    })
                });
                if (!res.ok) {
                    const errText = await res.text();
                    return NextResponse.json({ detail: `AI provider API error: ${errText}` }, { status: 400 });
                }
                const data = await res.json();
                contentText = data.choices?.[0]?.message?.content || "";
            } else if (provider === "gemini") {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt ?? "Write a test post" }] }]
                    })
                });
                if (!res.ok) {
                    const errText = await res.text();
                    return NextResponse.json({ detail: `Gemini API error: ${errText}` }, { status: 400 });
                }
                const data = await res.json();
                contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }

            if (!contentText.trim()) {
                return NextResponse.json({ detail: "Empty response from AI" }, { status: 400 });
            }
            return NextResponse.json({ success: true, content: contentText.trim() });
        }

        return NextResponse.json({ detail: "Invalid action." }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ detail: "Server error during LLM fetch." }, { status: 500 });
    }
}
