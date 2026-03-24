"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  BarChartIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  KeyIcon,
  LoaderIcon,
  XCircleIcon
} from "@/components/icons";

type ReasoningResponse = {
  detail?: string;
  model?: string;
  firstPrompt?: string;
  secondPrompt?: string;
  firstResponse?: string;
  secondResponse?: string;
  preservedReasoning?: boolean;
  firstUsage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  secondUsage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  firstLatencyMs?: number;
  secondLatencyMs?: number;
  statusCode?: number;
  responseSnippet?: string;
};

const DEFAULT_MODEL = "minimax/minimax-m2";
const DEFAULT_FIRST_PROMPT = "How many r's are in the word 'strawberry'?";
const DEFAULT_SECOND_PROMPT = "Are you sure? Think carefully.";

export function EmbeddingTestConsole() {
  const [serverConfigured, setServerConfigured] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [firstPrompt, setFirstPrompt] = useState(DEFAULT_FIRST_PROMPT);
  const [secondPrompt, setSecondPrompt] = useState(DEFAULT_SECOND_PROMPT);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReasoningResponse | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("or_api_key") || "";
    setApiKey(stored);
    setSavedKey(stored);

    async function loadDefaults() {
      try {
        const response = await fetch("/api/embedding-test", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          configured?: boolean;
          defaultModel?: string;
          defaultFirstPrompt?: string;
          defaultSecondPrompt?: string;
        };

        setServerConfigured(Boolean(payload.configured));
        if (payload.defaultModel) {
          setModel(payload.defaultModel);
        }
        if (payload.defaultFirstPrompt) {
          setFirstPrompt(payload.defaultFirstPrompt);
        }
        if (payload.defaultSecondPrompt) {
          setSecondPrompt(payload.defaultSecondPrompt);
        }
      } catch {
        // Keep local defaults if the metadata call fails.
      }
    }

    void loadDefaults();
  }, []);

  function onSaveKey() {
    const trimmed = apiKey.trim();
    window.localStorage.setItem("or_api_key", trimmed);
    setSavedKey(trimmed);
  }

  function onClearKey() {
    window.localStorage.removeItem("or_api_key");
    setApiKey("");
    setSavedKey("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/embedding-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: savedKey || undefined,
          model,
          firstPrompt,
          secondPrompt
        })
      });

      const payload = (await response.json()) as ReasoningResponse;
      if (!response.ok) {
        throw new Error(payload.detail || "Reasoning test failed.");
      }

      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reasoning test failed.");
    } finally {
      setIsRunning(false);
    }
  }

  const hasUsableKey = serverConfigured || Boolean(savedKey.trim());

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl border border-white/8 p-5">
        <h1 className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-3xl font-bold text-transparent">
          Minimax Reasoning Continuity Test
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Run two OpenRouter chat calls with{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-slate-200">
            {DEFAULT_MODEL}
          </code>
          , preserving <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-slate-200">reasoning_details</code> from call one into call two.
        </p>
      </div>

      <div className="glass-panel rounded-xl border border-white/8 p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyIcon className="h-5 w-5 text-cyan-300" />
          <h2 className="font-semibold text-white">OpenRouter Key</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              serverConfigured ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {serverConfigured ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
            {serverConfigured ? "Server key detected" : "Server key missing"}
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              savedKey ? "bg-cyan-500/15 text-cyan-300" : "bg-white/6 text-slate-400"
            }`}
          >
            {savedKey ? <CheckCircleIcon className="h-4 w-4" /> : <KeyIcon className="h-4 w-4" />}
            {savedKey ? "Browser key saved" : "No browser key saved"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste OpenRouter key (sk-or-v1-...)"
            className="input-field !h-11 !min-h-0 min-w-[300px] flex-1"
          />
          <button
            type="button"
            onClick={onSaveKey}
            disabled={!apiKey.trim()}
            className="button-primary !h-11 !px-4 !text-sm disabled:opacity-50"
          >
            Save key
          </button>
          <button
            type="button"
            onClick={onClearKey}
            disabled={!savedKey}
            className="button-secondary !h-11 !px-4 !text-sm disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          This page can use either your browser-saved key or the server key from environment variables. Keys are available at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
          >
            openrouter.ai/keys
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass-panel rounded-xl border border-white/8 p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-indigo-300" />
          <h2 className="font-semibold text-white">Reasoning Request</h2>
        </div>

        <div className="grid gap-3">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Model</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="input-field !h-11 !min-h-0"
            />
          </label>
        </div>

        <label className="mt-3 block space-y-2">
          <span className="text-sm text-slate-300">First prompt (reasoning enabled)</span>
          <input
            value={firstPrompt}
            onChange={(event) => setFirstPrompt(event.target.value)}
            className="input-field !h-11 !min-h-0"
          />
        </label>

        <label className="mt-3 block space-y-2">
          <span className="text-sm text-slate-300">Second prompt (continues prior reasoning)</span>
          <input
            value={secondPrompt}
            onChange={(event) => setSecondPrompt(event.target.value)}
            className="input-field !h-11 !min-h-0"
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={!hasUsableKey || isRunning}
            className="button-primary !h-11 !px-5 disabled:opacity-50"
          >
            {isRunning ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <BarChartIcon className="mr-2 h-4 w-4" />}
            {isRunning ? "Running..." : "Run two-call test"}
          </button>
          {!hasUsableKey ? (
            <p className="text-sm text-amber-300">Add a browser key or configure a server key first.</p>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </form>

      <div className="glass-panel rounded-xl border border-white/8 p-5">
        <h2 className="mb-3 font-semibold text-white">Result</h2>
        {!result ? (
          <p className="text-sm text-slate-400">Run the two-call test to see continuity behavior and outputs.</p>
        ) : (
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              <span className="text-slate-400">Model:</span> {result.model}
            </p>
            <p>
              <span className="text-slate-400">Reasoning preserved:</span>{" "}
              {result.preservedReasoning ? "Yes" : "No reasoning_details returned"}
            </p>
            <p>
              <span className="text-slate-400">Call 1 latency:</span> {result.firstLatencyMs}ms
            </p>
            <p>
              <span className="text-slate-400">Call 2 latency:</span> {result.secondLatencyMs}ms
            </p>
            <div>
              <p className="mb-1 text-slate-400">First response</p>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                {result.firstResponse}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-slate-400">Second response</p>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-cyan-200">
                {result.secondResponse}
              </pre>
            </div>
            {result.firstUsage ? (
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                {JSON.stringify(result.firstUsage, null, 2)}
              </pre>
            ) : null}
            {result.secondUsage ? (
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                {JSON.stringify(result.secondUsage, null, 2)}
              </pre>
            ) : null}
            <p className="text-xs text-slate-400">{result.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
