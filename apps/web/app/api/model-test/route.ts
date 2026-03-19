import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

const MODELS_TIMEOUT_MS = 5_000;
const TEST_TIMEOUT_MS = 10_000;
const CHAT_TIMEOUT_MS = 95_000;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterModelRecord = {
  id?: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: Record<string, string | number | undefined>;
};

const FALLBACK_FREE_MODELS = [
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    description: "Fastest fallback test model when the OpenRouter catalog is slow."
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Free)",
    description: "Large general chat model available on OpenRouter free tier."
  },
  {
    id: "qwen/qwen3-30b-a3b:free",
    name: "Qwen 3 30B (Free)",
    description: "Reliable multilingual free model for quick connectivity checks."
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3 (Free)",
    description: "Strong free chat model when available."
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super 120B (Free)",
    description: "Heavier reasoning model. Slower but still testable."
  },
  {
    id: "stepfun/step-3.5-flash:free",
    name: "Step 3.5 Flash (Free)",
    description: "Reasoning-capable free model that can be slower than Gemini."
  }
] as const;

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
    "HTTP-Referer": "https://mixedworld.ai",
    "X-Title": "MixedWorld"
  };
}

function isZeroPrice(value: unknown): boolean {
  if (typeof value === "number") {
    return value === 0;
  }
  if (typeof value === "string") {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized === 0;
  }
  return true;
}

function isFreeModel(model: OpenRouterModelRecord): boolean {
  if (typeof model.id === "string" && model.id.endsWith(":free")) {
    return true;
  }

  const pricing = model.pricing ?? {};
  return (
    isZeroPrice(pricing.prompt) &&
    isZeroPrice(pricing.completion) &&
    isZeroPrice(pricing.request) &&
    isZeroPrice(pricing.image)
  );
}

function normalizeFreeModels(data: unknown) {
  const records = Array.isArray((data as { data?: unknown[] })?.data)
    ? ((data as { data: OpenRouterModelRecord[] }).data ?? [])
    : [];

  return records
    .filter((model) => typeof model.id === "string" && typeof model.name === "string")
    .filter(isFreeModel)
    .map((model) => ({
      id: model.id as string,
      name: model.name as string,
      description: model.description ?? "",
      contextLength: model.context_length ?? undefined
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getFallbackModels() {
  return FALLBACK_FREE_MODELS.map((model) => ({ ...model }));
}

function extractMessageContent(payload: unknown): { content: string; reasoning?: string } {
  const choice = (payload as { choices?: Array<{ message?: { content?: unknown; reasoning_details?: unknown } }> })
    ?.choices?.[0];
  const message = choice?.message;

  let content = "";
  if (typeof message?.content === "string") {
    content = message.content;
  } else if (Array.isArray(message?.content)) {
    content = message.content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("");
  }

  let reasoning = "";
  if (typeof message?.reasoning_details === "string") {
    reasoning = message.reasoning_details;
  } else if (Array.isArray(message?.reasoning_details)) {
    reasoning = message.reasoning_details
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n");
  }

  return { content: content.trim(), reasoning: reasoning.trim() || undefined };
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

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        detail: "OPENROUTER_API_KEY is not configured on the server.",
        models: []
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/models",
      {
        headers: buildHeaders(apiKey),
        method: "GET"
      },
      MODELS_TIMEOUT_MS
    );

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {
          configured: true,
          detail: `OpenRouter model list failed with HTTP ${response.status}.`,
          models: []
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      configured: true,
      catalogSource: "live",
      models: normalizeFreeModels(payload)
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        catalogSource: "fallback",
        detail:
          "OpenRouter model catalog was slow, so MixedWorld loaded a fallback list of common free models instead.",
        models: getFallbackModels()
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { detail: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as {
    action?: "test" | "chat";
    model?: string;
    messages?: ChatMessage[];
  };

  if (!payload.action || !payload.model) {
    return NextResponse.json({ detail: "Missing action or model." }, { status: 400 });
  }

  try {
    if (payload.action === "test") {
      const startedAt = Date.now();
      const response = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: buildHeaders(apiKey),
          body: JSON.stringify({
            model: payload.model,
            messages: [{ role: "user", content: "Reply with exactly OK." }],
            max_tokens: 8,
            temperature: 0,
            reasoning: { enabled: false }
          })
        },
        TEST_TIMEOUT_MS
      );

      const responseText = await response.text();
      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            detail: `OpenRouter returned HTTP ${response.status}.`,
            latencyMs,
            statusCode: response.status,
            responseSnippet: responseText.slice(0, 300)
          },
          { status: 200 }
        );
      }

      const responsePayload = JSON.parse(responseText);
      const parsed = extractMessageContent(responsePayload);

      if (!parsed.content) {
        return NextResponse.json(
          {
            success: false,
            detail: "Model returned no visible reply.",
            latencyMs,
            statusCode: response.status
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        detail: parsed.content,
        latencyMs,
        statusCode: response.status
      });
    }

    if (payload.action === "chat") {
      if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
        return NextResponse.json({ detail: "Missing chat messages." }, { status: 400 });
      }

      const response = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: buildHeaders(apiKey),
          body: JSON.stringify({
            model: payload.model,
            messages: payload.messages,
            max_tokens: 700
          })
        },
        CHAT_TIMEOUT_MS
      );

      const responseText = await response.text();
      if (!response.ok) {
        return NextResponse.json(
          {
            detail: `OpenRouter returned HTTP ${response.status}.`,
            raw: responseText.slice(0, 500)
          },
          { status: response.status }
        );
      }

      const responsePayload = JSON.parse(responseText);
      const parsed = extractMessageContent(responsePayload);

      if (!parsed.content) {
        return NextResponse.json({ detail: "Model returned no visible reply." }, { status: 502 });
      }

      return NextResponse.json({
        message: {
          role: "assistant",
          content: parsed.content,
          reasoning_details: parsed.reasoning
        }
      });
    }

    return NextResponse.json({ detail: "Invalid action." }, { status: 400 });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        detail: isTimeout
          ? `Request timed out after ${(payload.action === "test" ? TEST_TIMEOUT_MS : CHAT_TIMEOUT_MS) / 1000}s.`
          : error instanceof Error
            ? error.message
            : "Unknown server error."
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
