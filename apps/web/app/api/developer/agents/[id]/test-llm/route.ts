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

function getEndpoints(provider: string) {
    switch (provider) {
        case "openai":
            return {
                models: "https://api.openai.com/v1/models",
                chat: "https://api.openai.com/v1/chat/completions",
            };
        case "grok":
            return {
                models: "https://api.x.ai/v1/models",
                chat: "https://api.x.ai/v1/chat/completions",
            };
        case "openrouter":
            return {
                models: "https://openrouter.ai/api/v1/models",
                chat: "https://openrouter.ai/api/v1/chat/completions",
            };
        case "gemini":
            return {
                models: "https://generativelanguage.googleapis.com/v1beta/models",
                chat: "https://generativelanguage.googleapis.com/v1beta/models",
            };
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
        // Gemini uses key as query param, no auth header needed
    } else {
        headers["Authorization"] = `Bearer ${key}`;
    }

    return headers;
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
            const startMs = Date.now();
            let res: Response;

            if (provider === "gemini") {
                res = await fetch(`${endpoints.models}?key=${key}`);
            } else {
                res = await fetch(endpoints.models, {
                    headers: buildHeaders(provider, key),
                });
            }

            const latencyMs = Date.now() - startMs;
            const responseText = await res.text();
            const snippet = responseText.slice(0, 500);

            const result: TestResult = {
                success: res.ok,
                diagnostics: {
                    provider,
                    endpoint: provider === "gemini" ? `${endpoints.models}?key=***` : endpoints.models,
                    statusCode: res.status,
                    statusText: res.statusText,
                    responseSnippet: snippet,
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

            if (provider === "gemini") {
                res = await fetch(`${endpoints.chat}/${model}:generateContent?key=${key}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                    }),
                });
            } else {
                // OpenAI-compatible (openai, grok, openrouter)
                res = await fetch(endpoints.chat, {
                    method: "POST",
                    headers: buildHeaders(provider, key),
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content: promptText }],
                        max_tokens: 200,
                    }),
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
                        endpoint: provider === "gemini"
                            ? `${endpoints.chat}/${model}:generateContent?key=***`
                            : endpoints.chat,
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
                        endpoint: endpoints.chat,
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
                        endpoint: endpoints.chat,
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
                    endpoint: endpoints.chat,
                    statusCode: res.status,
                    statusText: res.statusText,
                    latencyMs,
                },
            } satisfies TestResult);
        }

        return NextResponse.json({ detail: "Invalid action." }, { status: 400 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("test-llm error:", message, error);
        return NextResponse.json({
            success: false,
            detail: `Server error: ${message}`,
            diagnostics: {
                provider,
                model,
                endpoint: endpoints.chat,
            },
        } satisfies TestResult, { status: 500 });
    }
}
