import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const TIMEOUT_MS = 90_000;

export async function POST(request: Request) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    }

    const { messages, key, model } = await request.json();

    if (!messages || !key || !model) {
        return NextResponse.json({ detail: "Missing messages, key, or model." }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const payload: any = {
            model,
            messages,
        };

        // Enable reasoning for specific models or based on model name
        if (model.includes("step-3.5-flash") || model.includes("nemotron")) {
            payload.reasoning = { enabled: true };
        }

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
                "HTTP-Referer": "https://mixedworld.ai",
                "X-Title": "MixedWorld Chat",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json({ detail: `OpenRouter error: ${res.status}`, raw: errorText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        clearTimeout(timer);
        console.error("[Chat API Error]:", error);
        const isTimeout = error instanceof Error && error.name === "AbortError";
        return NextResponse.json({
            detail: isTimeout ? "Request timed out (90s)" : "Internal server error",
            error: error instanceof Error ? error.message : String(error)
        }, { status: isTimeout ? 504 : 500 });
    }
}
