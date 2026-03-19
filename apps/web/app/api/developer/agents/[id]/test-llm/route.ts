import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

interface TestPayload {
    action: "connection" | "post";
    provider: string;
    model: string;
    key: string;
    prompt?: string;
}

interface TestResult {
    success: boolean;
    content?: string;
    detail?: string;
    diagnostics?: {
        provider: string;
        model?: string;
        endpoint: string;
        statusCode?: number;
        statusText?: string;
        responseSnippet?: string;
        latencyMs?: number;
    };
}

const TIMEOUT_MS = 60_000;

function getEndpoints(provider: string) {
    switch (provider) {
        case "openai":
            return { chat: "https://api.openai.com/v1/chat/completions" };
        case "grok":
            return { chat: "https://api.x.ai/v1/chat/completions" };
        case "openrouter":
            return { chat: "https://openrouter.ai/api/v1/chat/completions" };
        case "gemini":
            return { chat: "https://generativelanguage.googleapis.com/v1beta/models" };
        default:
            return null;
    }
}

function buildHeaders(provider: string, key: string): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (provider === "openrouter") {
        headers["Authorization"] = `Bearer ${key}`;
        headers["HTTP-Referer"] = "https://mixedworld.ai";
        headers["X-Title"] = "MixedWorld";
    } else if (provider === "gemini") {
        // Gemini uses key as query param
    } else {
        headers["Authorization"] = `Bearer ${key}`;
    }

    return headers;
}

// Models that support the reasoning parameter
const REASONING_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-super-120b-a12b",
];

function supportsReasoning(model: string): boolean {
    return REASONING_MODELS.some(m => model.startsWith(m));
}

function buildChatBody(model: string, messages: Array<{ role: string; content: string }>, maxTokens: number) {
    const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
    };
    if (supportsReasoning(model)) {
        body.reasoning = { enabled: true };
    }
    return body;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    await props.params;
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    }

    let payload: TestPayload | null = null;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
    }

    if (!payload || !payload.provider || !payload.key) {
        return NextResponse.json({ detail: "Missing provider or key." }, { status: 400 });
    }

    const { action, provider, model, key, prompt } = payload;
    const endpoints = getEndpoints(provider);

    if (!endpoints) {
        return NextResponse.json({ detail: `Unknown provider: ${provider}` }, { status: 400 });
    }

    try {
        if (action === "connection") {
            // Test connection by making a tiny chat completion request
            // This is more reliable than hitting /models (which can return huge payloads)
            const startMs = Date.now();
            let res: Response;
            let endpoint: string;

            if (provider === "gemini") {
                const testModel = model || "gemini-2.5-flash";
                endpoint = `${endpoints.chat}/${testModel}:generateContent?key=${key}`;
                res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Say hi" }] }],
                        generationConfig: { maxOutputTokens: 5 },
                    }),
                });
            } else {
                endpoint = endpoints.chat;
                const testModel = model || (provider === "openai" ? "gpt-4o-mini" : provider === "grok" ? "grok-beta" : "meta-llama/llama-3.3-70b-instruct:free");
                res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: buildHeaders(provider, key),
                    body: JSON.stringify(buildChatBody(
                        testModel,
                        [{ role: "user", content: "Say hi" }],
                        5
                    )),
                });
            }

            const latencyMs = Date.now() - startMs;
            const responseText = await res.text();
            const snippet = responseText.slice(0, 500);

            const result: TestResult = {
                success: res.ok,
                diagnostics: {
                    provider,
                    model: model || "(default)",
                    endpoint: provider === "gemini" ? endpoint.replace(key, "***") : endpoint,
                    statusCode: res.status,
                    statusText: res.statusText,
                    responseSnippet: res.ok ? undefined : snippet,
                    latencyMs,
                },
            };

            if (!res.ok) {
                result.detail = `Connection failed (HTTP ${res.status}). Check your API key.`;
            }

            return NextResponse.json(result, { status: res.ok ? 200 : 400 });

        } else if (action === "post") {
            if (!model) {
                return NextResponse.json({ success: false, detail: "Model is required for test posts." }, { status: 400 });
            }

            const startMs = Date.now();
            const promptText = prompt ?? "Write a short, friendly test post for social media.";
            let res: Response;
            let endpoint: string;

            if (provider === "gemini") {
                endpoint = `${endpoints.chat}/${model}:generateContent?key=${key}`;
                res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                    }),
                });
            } else {
                endpoint = endpoints.chat;
                res = await fetchWithTimeout(endpoint, {
                    method: "POST",
                    headers: buildHeaders(provider, key),
                    body: JSON.stringify(buildChatBody(
                        model,
                        [{ role: "user", content: promptText }],
                        200
                    )),
                });
            }

            const latencyMs = Date.now() - startMs;
            const responseText = await res.text();

            if (!res.ok) {
                const snippet = responseText.slice(0, 800);
                return NextResponse.json({
                    success: false,
                    detail: `AI provider returned HTTP ${res.status}: ${res.statusText}`,
                    diagnostics: {
                        provider,
                        model,
                        endpoint: provider === "gemini" ? endpoint.replace(key, "***") : endpoint,
                        statusCode: res.status,
                        statusText: res.statusText,
                        responseSnippet: snippet,
                        latencyMs,
                    },
                } satisfies TestResult, { status: 400 });
            }

            let contentText = "";
            try {
                const data = JSON.parse(responseText);
                if (provider === "gemini") {
                    contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                } else {
                    contentText = data.choices?.[0]?.message?.content || "";
                }
            } catch {
                return NextResponse.json({
                    success: false,
                    detail: "Failed to parse AI response.",
                    diagnostics: {
                        provider,
                        model,
                        endpoint: provider === "gemini" ? endpoint.replace(key, "***") : endpoint,
                        statusCode: res.status,
                        statusText: res.statusText,
                        responseSnippet: responseText.slice(0, 500),
                        latencyMs,
                    },
                } satisfies TestResult, { status: 400 });
            }

            if (!contentText.trim()) {
                return NextResponse.json({
                    success: false,
                    detail: "AI returned an empty response.",
                    diagnostics: {
                        provider,
                        model,
                        endpoint: provider === "gemini" ? endpoint.replace(key, "***") : endpoint,
                        statusCode: res.status,
                        statusText: res.statusText,
                        responseSnippet: responseText.slice(0, 500),
                        latencyMs,
                    },
                } satisfies TestResult, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                content: contentText.trim(),
                diagnostics: {
                    provider,
                    model,
                    endpoint: provider === "gemini" ? endpoint.replace(key, "***") : endpoint,
                    statusCode: res.status,
                    statusText: res.statusText,
                    latencyMs,
                },
            } satisfies TestResult);
        }

        return NextResponse.json({ detail: "Invalid action." }, { status: 400 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const isTimeout = error instanceof Error && error.name === "AbortError";
        console.error("test-llm error:", message, error);
        return NextResponse.json({
            success: false,
            detail: isTimeout
                ? `Request timed out after ${TIMEOUT_MS / 1000}s. The AI provider may be slow or unreachable.`
                : `Server error: ${message}`,
            diagnostics: {
                provider,
                model,
                endpoint: endpoints.chat,
                latencyMs: isTimeout ? TIMEOUT_MS : undefined,
            },
        } satisfies TestResult, { status: isTimeout ? 504 : 500 });
    }
}
