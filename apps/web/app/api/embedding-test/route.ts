import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

const CHAT_TIMEOUT_MS = 60_000;

function getOpenRouterApiKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY ??
    process.env.OPENROUTER_KEY ??
    process.env.OPENROUTER_API_TOKEN ??
    process.env.OPENROUTER_TOKEN ??
    null
  );
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://mixedworld.ai",
    "X-Title": process.env.OPENROUTER_SITE_NAME ?? "MixedWorld",
    "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME ?? "MixedWorld"
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  return NextResponse.json({
    configured: Boolean(getOpenRouterApiKey()),
    defaultModel: "minimax/minimax-m2",
    defaultFirstPrompt: "How many r's are in the word 'strawberry'?",
    defaultSecondPrompt: "Are you sure? Think carefully."
  });
}

type ChatMessageWithReasoning = {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: unknown;
};

type ReasoningPayload = {
  key?: string;
  model?: string;
  firstPrompt?: string;
  secondPrompt?: string;
};

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  const payload = (await request.json()) as ReasoningPayload;
  const apiKey = payload.key?.trim() || getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { detail: "No OpenRouter key available. Save one in this page or configure a server key." },
      { status: 400 }
    );
  }

  const model = payload.model?.trim() || "minimax/minimax-m2";
  const firstPrompt = payload.firstPrompt?.trim() || "How many r's are in the word 'strawberry'?";
  const secondPrompt = payload.secondPrompt?.trim() || "Are you sure? Think carefully.";

  try {
    const startedAtFirst = Date.now();
    const firstResponse = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: firstPrompt }],
          reasoning: { enabled: true }
        })
      },
      CHAT_TIMEOUT_MS
    );

    const firstText = await firstResponse.text();
    const firstLatencyMs = Date.now() - startedAtFirst;

    if (!firstResponse.ok) {
      const modelHint =
        firstResponse.status === 404
          ? "Model may be unavailable. Try minimax/minimax-m2 or another currently listed OpenRouter model ID."
          : undefined;
      return NextResponse.json(
        {
          detail: modelHint
            ? `First call failed with HTTP ${firstResponse.status}. ${modelHint}`
            : `First call failed with HTTP ${firstResponse.status}.`,
          statusCode: firstResponse.status,
          responseSnippet: firstText.slice(0, 500),
          latencyMs: firstLatencyMs
        },
        { status: firstResponse.status }
      );
    }

    const firstPayload = JSON.parse(firstText) as {
      choices?: Array<{
        message?: {
          role?: "assistant";
          content?: string;
          reasoning_details?: unknown;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const firstMessage = firstPayload.choices?.[0]?.message;
    if (!firstMessage || typeof firstMessage.content !== "string") {
      return NextResponse.json(
        { detail: "First call returned no assistant message.", latencyMs: firstLatencyMs },
        { status: 502 }
      );
    }

    const continuedMessages: ChatMessageWithReasoning[] = [
      { role: "user", content: firstPrompt },
      {
        role: "assistant",
        content: firstMessage.content,
        reasoning_details: firstMessage.reasoning_details
      },
      { role: "user", content: secondPrompt }
    ];

    const startedAtSecond = Date.now();
    const secondResponse = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: continuedMessages
        })
      },
      CHAT_TIMEOUT_MS
    );

    const secondText = await secondResponse.text();
    const secondLatencyMs = Date.now() - startedAtSecond;

    if (!secondResponse.ok) {
      return NextResponse.json(
        {
          detail: `Second call failed with HTTP ${secondResponse.status}.`,
          statusCode: secondResponse.status,
          responseSnippet: secondText.slice(0, 500),
          firstResponse: firstMessage.content,
          firstLatencyMs,
          secondLatencyMs
        },
        { status: secondResponse.status }
      );
    }

    const secondPayload = JSON.parse(secondText) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const secondMessage = secondPayload.choices?.[0]?.message?.content;
    if (typeof secondMessage !== "string" || !secondMessage.trim()) {
      return NextResponse.json(
        { detail: "Second call returned no assistant message.", secondLatencyMs },
        { status: 502 }
      );
    }

    return NextResponse.json({
      detail: "Reasoning continuity test completed.",
      model,
      firstPrompt,
      secondPrompt,
      firstResponse: firstMessage.content,
      secondResponse: secondMessage,
      firstLatencyMs,
      secondLatencyMs,
      preservedReasoning: Boolean(firstMessage.reasoning_details),
      firstUsage: firstPayload.usage ?? null,
      secondUsage: secondPayload.usage ?? null
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        detail: isTimeout
          ? `Request timed out after ${CHAT_TIMEOUT_MS / 1000}s.`
          : error instanceof Error
            ? error.message
            : "Unknown server error."
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
