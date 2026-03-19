"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BotIcon, CheckCircleIcon, MessageIcon, UserIcon } from "@/components/icons";
import { Panel } from "@/components/panel";

interface FreeModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
}

interface ModelResult {
  status: "idle" | "testing" | "working" | "failed";
  detail?: string;
  latencyMs?: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string;
}

const CHAT_TIMEOUT_MS = 95_000;
const MODEL_LOAD_TIMEOUT_MS = 12_000;
const TEST_TIMEOUT_MS = 14_000;

export function ModelTestConsole() {
  const [models, setModels] = useState<FreeModel[]>([]);
  const [results, setResults] = useState<Record<string, ModelResult>>({});
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsNotice, setModelsNotice] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const workingModels = useMemo(
    () => models.filter((model) => results[model.id]?.status === "working"),
    [models, results]
  );

  const recommendedModel = useMemo(() => {
    return workingModels
      .map((model) => ({
        model,
        latencyMs: results[model.id]?.latencyMs ?? Number.MAX_SAFE_INTEGER
      }))
      .sort((left, right) => left.latencyMs - right.latencyMs)[0]?.model;
  }, [results, workingModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelsLoading(true);
      setModelsError(null);
      setModelsNotice(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MODEL_LOAD_TIMEOUT_MS);
      try {
        const response = await fetch("/api/model-test", {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json()) as {
          configured?: boolean;
          catalogSource?: "live" | "fallback";
          detail?: string;
          models?: FreeModel[];
        };
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(data.detail || "Could not load models.");
        }

        if (!data.configured) {
          throw new Error(data.detail || "OpenRouter key is not configured on the server.");
        }

        const nextModels = data.models ?? [];
        if (!cancelled) {
          setModels(nextModels);
          setSelectedModel((current) => current || nextModels[0]?.id || "");
          setModelsNotice(data.catalogSource === "fallback" ? data.detail ?? null : null);
          setResults(
            nextModels.reduce<Record<string, ModelResult>>((acc, model) => {
              acc[model.id] = { status: "idle" };
              return acc;
            }, {})
          );
        }
      } catch (err) {
        clearTimeout(timeout);
        if (!cancelled) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          setModelsError(
            isAbort
              ? "Timed out while loading models from the server. Refresh and try again."
              : err instanceof Error
                ? err.message
                : "Could not load models."
          );
        }
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSingleTest(model: FreeModel) {
    setResults((current) => ({
      ...current,
      [model.id]: { status: "testing" }
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "test",
          model: model.id
        })
      });
      clearTimeout(timeout);

      const data = (await response.json()) as {
        success?: boolean;
        detail?: string;
        latencyMs?: number;
      };

      setResults((current) => ({
        ...current,
        [model.id]: {
          status: data.success ? "working" : "failed",
          detail: data.detail,
          latencyMs: data.latencyMs
        }
      }));

      if (data.success) {
        setSelectedModel((current) => {
          if (!current) {
            return model.id;
          }

          return results[current]?.status === "working" ? current : model.id;
        });
      }
    } catch (err) {
      setResults((current) => ({
        ...current,
        [model.id]: {
          status: "failed",
          detail:
            err instanceof Error && err.name === "AbortError"
              ? `Timed out after ${TEST_TIMEOUT_MS / 1000}s.`
              : err instanceof Error
                ? err.message
                : "Unknown test error."
        }
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handleTestAll() {
    setTestingAll(true);
    for (const model of models) {
      await runSingleTest(model);
    }
    setTestingAll(false);
  }

  async function handleChatSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!chatInput.trim() || !selectedModel || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);
    setChatStatus(`Contacting ${models.find((model) => model.id === selectedModel)?.name ?? "model"}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          model: selectedModel,
          messages: nextMessages
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = (await response.json()) as {
        detail?: string;
        message?: ChatMessage;
      };

      if (!response.ok) {
        throw new Error(data.detail || "Chat request failed.");
      }

      if (!data.message?.content) {
        throw new Error("Model returned no visible reply.");
      }

      setChatMessages([...nextMessages, data.message]);
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      setChatError(
        isAbort
          ? "Chat request timed out after 95 seconds. Try one of the working models above."
          : err instanceof Error
            ? err.message
            : "Unknown chat error."
      );
    } finally {
      setChatLoading(false);
      setChatStatus(null);
    }
  }

  const chatModelOptions = workingModels.length > 0 ? workingModels : models;

  useEffect(() => {
    if (!selectedModel && chatModelOptions[0]) {
      setSelectedModel(chatModelOptions[0].id);
      return;
    }

    if (selectedModel && chatModelOptions.length > 0 && !chatModelOptions.some((model) => model.id === selectedModel)) {
      setSelectedModel(chatModelOptions[0].id);
    }
  }, [chatModelOptions, selectedModel]);

  return (
    <div className="space-y-4">
      <Panel
        kicker="Server-managed OpenRouter"
        title="Test Model Connection"
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-body">
              This page loads all free OpenRouter models using the server-side API key, tests them one by one,
              and helps you pick a working model for chat.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="button-primary"
                onClick={() => void handleTestAll()}
                disabled={modelsLoading || !!modelsError || models.length === 0 || testingAll}
              >
                {testingAll ? "Testing models one by one..." : "Test all free models"}
              </button>
              <button
                className="button-secondary"
                onClick={() => window.location.reload()}
                disabled={modelsLoading}
              >
                Refresh model list
              </button>
            </div>
            {modelsError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {modelsError}
              </div>
            ) : null}
            {modelsNotice ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                {modelsNotice}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="inner-panel rounded-xl p-3">
              <p className="eyebrow">Loaded</p>
              <p className="mt-2 text-2xl font-semibold text-white">{modelsLoading ? "..." : models.length}</p>
              <p className="mt-1 text-xs text-slate-400">Free OpenRouter models found</p>
            </div>
            <div className="inner-panel rounded-xl p-3">
              <p className="eyebrow">Working</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{workingModels.length}</p>
              <p className="mt-1 text-xs text-slate-400">Models that passed connection test</p>
            </div>
            <div className="inner-panel rounded-xl p-3">
              <p className="eyebrow">Recommended</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {recommendedModel ? recommendedModel.name : "Run tests first"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {recommendedModel ? "Fastest successful response so far" : "Best chat model will appear here"}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <Panel kicker="Results" title="Free model status" contentClassName="space-y-3">
          {modelsLoading ? (
            <p className="text-sm text-slate-400">Loading free models...</p>
          ) : (
            <div className="space-y-2">
              {models.map((model) => {
                const result = results[model.id] ?? { status: "idle" as const };
                const isWorking = result.status === "working";
                const isFailed = result.status === "failed";
                const isTesting = result.status === "testing";

                return (
                  <div
                    key={model.id}
                    className="inner-panel flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{model.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isWorking
                              ? "bg-emerald-500/15 text-emerald-300"
                              : isFailed
                                ? "bg-red-500/15 text-red-300"
                                : isTesting
                                  ? "bg-cyan-500/15 text-cyan-300"
                                  : "bg-white/6 text-slate-400"
                          }`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{model.id}</p>
                      {result.detail ? (
                        <p className={`text-xs leading-5 ${isWorking ? "text-slate-300" : "text-slate-400"}`}>
                          {result.detail}
                        </p>
                      ) : model.description ? (
                        <p className="text-xs leading-5 text-slate-500">{model.description}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {typeof result.latencyMs === "number" ? (
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-slate-300">
                          {result.latencyMs} ms
                        </span>
                      ) : null}
                      <button
                        className="button-secondary !h-8 !px-3 !text-xs"
                        onClick={() => void runSingleTest(model)}
                        disabled={testingAll || isTesting}
                      >
                        {isTesting ? "Testing..." : "Test"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel kicker="Chat" title="Try a working model" contentClassName="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Chat model
              </label>
              <select
                className="input-field !h-10 !min-h-0"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={chatModelOptions.length === 0}
              >
                {chatModelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {workingModels.length > 0
                  ? "Only models that passed the connection test are shown here."
                  : "Run the connection test first to build a shortlist of working models."}
              </p>
            </div>

            <div className="glass-panel relative flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-white/5">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 no-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center space-y-4 px-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
                      <CheckCircleIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white">Ready for chat</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        Pick a model above, then send a message here to confirm it works for real conversation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[85%] items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 ${message.role === "user" ? "bg-cyan-500/20" : "bg-violet-500/20"}`}
                          >
                            {message.role === "user" ? (
                              <UserIcon className="h-4 w-4 text-cyan-400" />
                            ) : (
                              <BotIcon className="h-4 w-4 text-violet-400" />
                            )}
                          </div>
                          <div className="space-y-2">
                            {message.reasoning_details ? (
                              <div className="rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[10px] italic text-slate-500">
                                <span className="mb-1 block text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                  Reasoning Process
                                </span>
                                {message.reasoning_details}
                              </div>
                            ) : null}
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user"
                                  ? "rounded-tr-none bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                                  : "inner-panel rounded-tl-none text-slate-200"
                                }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="border-t border-white/5 bg-black/40 p-4">
                {chatError ? (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    {chatError}
                  </div>
                ) : null}
                {chatLoading && chatStatus ? (
                  <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300">
                    {chatStatus}
                  </div>
                ) : null}
                <form onSubmit={handleChatSubmit} className="group relative">
                  <input
                    className="input-field !bg-white/5 !pr-24 transition-all duration-300 group-hover:!bg-white/10 focus:!bg-white/10"
                    placeholder={
                      workingModels.length === 0
                        ? "Run model tests first..."
                        : "Ask the selected model anything..."
                    }
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading || !selectedModel || workingModels.length === 0}
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    <button
                      type="submit"
                      className="button-primary !h-8 !px-4 !text-xs disabled:opacity-50"
                      disabled={chatLoading || !selectedModel || !chatInput.trim() || workingModels.length === 0}
                    >
                      {chatLoading ? "Thinking..." : "Send"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
