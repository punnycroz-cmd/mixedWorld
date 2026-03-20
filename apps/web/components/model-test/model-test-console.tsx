"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BarChartIcon,
  CheckCircleIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  KeyIcon,
  LoaderIcon,
  MessageIcon,
  PlayIcon,
  RefreshIcon,
  SendIcon,
  UserIcon,
  XCircleIcon,
  ZapIcon
} from "@/components/icons";
import { OPENROUTER_FREE_MODELS, type OpenRouterFreeModel } from "@/lib/openrouter-free-models";

type ModelStatus = "idle" | "testing" | "success" | "error";
type ChatMode = "single" | "auto";

interface ModelState {
  id: string;
  status: ModelStatus;
  latency?: number;
  error?: string;
}

interface AutoTestResult {
  modelId: string;
  modelName: string;
  content: string;
  latency: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

const TEST_TIMEOUT_MS = 14_000;
const CHAT_TIMEOUT_MS = 95_000;

export function ModelTestConsole() {
  const [activeTab, setActiveTab] = useState<"tester" | "chat">("tester");
  const [serverConfigured, setServerConfigured] = useState(false);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [models, setModels] = useState<OpenRouterFreeModel[]>([]);
  const [modelStates, setModelStates] = useState<ModelState[]>(
    OPENROUTER_FREE_MODELS.map((model) => ({ id: model.id, status: "idle" }))
  );
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [selectedModel, setSelectedModel] = useState(OPENROUTER_FREE_MODELS[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("single");
  const [autoTestResults, setAutoTestResults] = useState<AutoTestResult[]>([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [autoTestPrompt, setAutoTestPrompt] = useState("Explain quantum computing in 2 sentences.");
  const [showOnlyWorking, setShowOnlyWorking] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modelMap = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
  const workingModels = useMemo(
    () => modelStates.filter((state) => state.status === "success"),
    [modelStates]
  );
  const failedModels = useMemo(
    () => modelStates.filter((state) => state.status === "error"),
    [modelStates]
  );
  const workingModelIds = useMemo(
    () => new Set(workingModels.map((state) => state.id)),
    [workingModels]
  );

  const chatModelOptions = useMemo(() => {
    return showOnlyWorking ? models.filter((model) => workingModelIds.has(model.id)) : models;
  }, [models, showOnlyWorking, workingModelIds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, autoTestResults]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelsLoading(true);
      setModelsError(null);
      setServerNotice(null);

      try {
        const response = await fetch("/api/model-test", { cache: "no-store" });
        const data = (await response.json()) as {
          configured?: boolean;
          detail?: string;
          models?: OpenRouterFreeModel[];
        };

        if (!response.ok) {
          throw new Error(data.detail || "Could not load model tester.");
        }

        if (!cancelled) {
          const nextModels = data.models?.length ? data.models : OPENROUTER_FREE_MODELS;
          setServerConfigured(Boolean(data.configured));
          setServerNotice(data.detail ?? null);
          setModels(nextModels);
          setSelectedModel(nextModels[0]?.id ?? "");
          setModelStates(nextModels.map((model) => ({ id: model.id, status: "idle" })));
        }
      } catch (error) {
        if (!cancelled) {
          setModelsError(error instanceof Error ? error.message : "Could not load model tester.");
          setModels(OPENROUTER_FREE_MODELS);
          setModelStates(OPENROUTER_FREE_MODELS.map((model) => ({ id: model.id, status: "idle" })));
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

  useEffect(() => {
    if (!selectedModel && chatModelOptions[0]) {
      setSelectedModel(chatModelOptions[0].id);
      return;
    }

    if (selectedModel && chatModelOptions.length > 0 && !chatModelOptions.some((model) => model.id === selectedModel)) {
      setSelectedModel(chatModelOptions[0].id);
    }
  }, [chatModelOptions, selectedModel]);

  async function testModel(modelId: string): Promise<boolean> {
    if (!serverConfigured) return false;

    setModelStates((current) =>
      current.map((model) => (model.id === modelId ? { ...model, status: "testing", error: undefined } : model))
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "test",
          model: modelId
        })
      });

      clearTimeout(timeout);
      const data = (await response.json()) as {
        success?: boolean;
        detail?: string;
        latencyMs?: number;
      };

      if (data.success) {
        setModelStates((current) =>
          current.map((model) =>
            model.id === modelId
              ? { ...model, status: "success", latency: data.latencyMs, error: undefined }
              : model
          )
        );
        return true;
      }

      setModelStates((current) =>
        current.map((model) =>
          model.id === modelId
            ? { ...model, status: "error", latency: data.latencyMs, error: data.detail || "Connection failed." }
            : model
        )
      );
      return false;
    } catch (error) {
      clearTimeout(timeout);
      setModelStates((current) =>
        current.map((model) =>
          model.id === modelId
            ? {
                ...model,
                status: "error",
                error:
                  error instanceof Error && error.name === "AbortError"
                    ? `Timed out after ${TEST_TIMEOUT_MS / 1000}s`
                    : "Network error"
              }
            : model
        )
      );
      return false;
    }
  }

  async function testAllModels() {
    setIsTestingAll(true);
    setModelStates(models.map((model) => ({ id: model.id, status: "idle" })));

    for (const model of models) {
      await testModel(model.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsTestingAll(false);
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !selectedModel || isChatting || !serverConfigured) return;

    const userMsg: Message = { role: "user", content: inputMessage };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage("");
    setChatError(null);
    setIsChatting(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "chat",
          model: selectedModel,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });

      clearTimeout(timeout);
      const data = (await response.json()) as {
        detail?: string;
        message?: { content?: string };
      };

      if (!response.ok || !data.message?.content) {
        throw new Error(data.detail || "No response from model.");
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.message.content,
        model: selectedModel
      };
      setMessages((current) => [...current, assistantMsg]);
    } catch (error) {
      clearTimeout(timeout);
      const detail =
        error instanceof Error && error.name === "AbortError"
          ? `Timed out after ${CHAT_TIMEOUT_MS / 1000}s`
          : error instanceof Error
            ? error.message
            : "Network error. Please try again.";
      setChatError(detail);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Error: ${detail}`, model: selectedModel }
      ]);
    } finally {
      setIsChatting(false);
    }
  }

  async function runAutoTest() {
    if (!serverConfigured || workingModels.length === 0) return;

    setIsAutoTesting(true);
    setAutoTestResults([]);

    const results: AutoTestResult[] = [];
    for (const modelState of workingModels) {
      const startTime = Date.now();

      try {
        const response = await fetch("/api/model-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            model: modelState.id,
            messages: [{ role: "user", content: autoTestPrompt }]
          })
        });

        const data = (await response.json()) as {
          detail?: string;
          message?: { content?: string };
        };

        if (response.ok && data.message?.content) {
          const modelInfo = modelMap.get(modelState.id);
          results.push({
            modelId: modelState.id,
            modelName: modelInfo?.name ?? modelState.id,
            content: data.message.content,
            latency: Date.now() - startTime
          });
        }
      } catch {
        // Skip failed models during auto compare.
      }

      setAutoTestResults([...results]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsAutoTesting(false);
  }

  function clearChat() {
    setMessages([]);
    setAutoTestResults([]);
    setChatError(null);
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl border border-white/8 p-5">
        <header className="mb-6">
          <h1 className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-3xl font-bold text-transparent">
            OpenRouter Free Models Tester
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Test all {models.length || OPENROUTER_FREE_MODELS.length} free models and chat with the working ones.
          </p>
        </header>

        <div className="rounded-xl border border-white/8 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-cyan-300" />
            <h2 className="font-semibold text-white">Server API Key Setup</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                serverConfigured
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {serverConfigured ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  OpenRouter API key detected on server
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4" />
                  OpenRouter API key missing on server
                </>
              )}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="button-secondary !h-10 !px-4 !text-sm"
            >
              <RefreshIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>

          {serverNotice ? <p className="mt-3 text-sm text-slate-400">{serverNotice}</p> : null}
          {modelsError ? <p className="mt-3 text-sm text-red-400">{modelsError}</p> : null}

          <p className="mt-3 text-xs text-slate-500">
            Manage your secret in Vercel project settings. OpenRouter keys live at{" "}
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
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("tester")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "tester" ? "bg-cyan-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <ZapIcon className="h-4 w-4" />
          Connection Tester
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "chat" ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <MessageIcon className="h-4 w-4" />
          Chat Test
        </button>
      </div>

      {activeTab === "tester" ? (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <DatabaseIcon className="h-5 w-5 text-violet-300" />
              <h2 className="font-semibold text-white">Free Models ({models.length})</h2>
              {workingModels.length > 0 ? (
                <span className="text-sm text-emerald-300">{workingModels.length} working</span>
              ) : null}
              {failedModels.length > 0 ? (
                <span className="text-sm text-red-300">{failedModels.length} failed</span>
              ) : null}
            </div>
            <button
              onClick={() => void testAllModels()}
              disabled={!serverConfigured || isTestingAll || modelsLoading}
              className="button-primary !h-10 !px-4 !text-sm disabled:opacity-50"
            >
              {isTestingAll ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshIcon className="mr-2 h-4 w-4" />}
              {isTestingAll ? "Testing..." : "Test All Models"}
            </button>
          </div>

          {!serverConfigured ? (
            <div className="p-10 text-center text-slate-500">
              <KeyIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Set your OpenRouter key on the server first.</p>
            </div>
          ) : null}

          <div className="grid max-h-[640px] gap-2 overflow-y-auto p-4">
            {modelsLoading ? (
              <div className="rounded-xl border border-white/8 bg-white/5 p-4 text-sm text-slate-400">
                Loading curated free models...
              </div>
            ) : null}

            {models.map((model) => {
              const state = modelStates.find((entry) => entry.id === model.id) ?? { id: model.id, status: "idle" as const };
              return (
                <div
                  key={model.id}
                  className={`rounded-xl border p-3 transition-all ${
                    state.status === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : state.status === "error"
                        ? "border-red-500/30 bg-red-500/10"
                        : state.status === "testing"
                          ? "border-cyan-500/30 bg-cyan-500/10"
                          : "border-white/8 bg-white/4"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-[240px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{model.name}</span>
                        <span className="rounded bg-white/8 px-2 py-0.5 text-xs text-slate-300">{model.size}</span>
                        {state.status === "success" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                            <CheckCircleIcon className="h-3 w-3" />
                            Working
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{model.desc}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{model.id}</p>
                      {state.error ? <p className="mt-1 text-xs text-red-300">{state.error}</p> : null}
                    </div>

                    <div className="flex items-center gap-3">
                      {state.latency ? <span className="text-sm text-emerald-300">{state.latency}ms</span> : null}
                      {state.status === "success" ? <CheckCircleIcon className="h-5 w-5 text-emerald-300" /> : null}
                      {state.status === "error" ? <XCircleIcon className="h-5 w-5 text-red-300" /> : null}
                      {state.status === "testing" ? <LoaderIcon className="h-5 w-5 animate-spin text-cyan-300" /> : null}
                      <button
                        onClick={() => void testModel(model.id)}
                        disabled={!serverConfigured || state.status === "testing" || isTestingAll}
                        className="button-secondary !h-9 !px-3 !text-sm disabled:opacity-50"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel flex flex-col overflow-hidden rounded-xl border border-white/8">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/8 p-3">
            <div className="flex rounded-lg bg-white/5 p-1">
              <button
                onClick={() => setChatMode("single")}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  chatMode === "single" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Single Model
              </button>
              <button
                onClick={() => setChatMode("auto")}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  chatMode === "auto" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Auto Test All
              </button>
            </div>

            {chatMode === "single" ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input-field !h-10 !min-h-0 !w-[300px]"
                >
                  {chatModelOptions.length === 0 ? (
                    <option value="">No working models - run connection test first</option>
                  ) : (
                    chatModelOptions.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))
                  )}
                </select>

                {workingModels.length > 0 ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={showOnlyWorking}
                      onChange={(e) => setShowOnlyWorking(e.target.checked)}
                      className="rounded border-white/20 bg-transparent"
                    />
                    Only working ({workingModels.length})
                  </label>
                ) : null}
              </div>
            ) : null}

            <button onClick={clearChat} className="button-secondary ml-auto !h-10 !px-4 !text-sm">
              Clear
            </button>
          </div>

          {chatMode === "auto" ? (
            <div className="border-b border-white/8 bg-white/4 p-4">
              <div className="mb-3 flex items-center gap-3">
                <BarChartIcon className="h-5 w-5 text-violet-300" />
                <h3 className="font-semibold text-white">Auto Test Working Models</h3>
                <span className="text-sm text-slate-400">({workingModels.length} working models found)</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={autoTestPrompt}
                  onChange={(e) => setAutoTestPrompt(e.target.value)}
                  placeholder="Enter test prompt..."
                  className="input-field !h-10 !min-h-0 flex-1"
                />
                <button
                  onClick={() => void runAutoTest()}
                  disabled={!serverConfigured || workingModels.length === 0 || isAutoTesting}
                  className="button-primary !h-10 !px-4 !text-sm disabled:opacity-50"
                >
                  {isAutoTesting ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                  {isAutoTesting ? "Testing..." : "Run Auto Test"}
                </button>
              </div>

              {workingModels.length === 0 ? (
                <p className="mt-2 text-sm text-amber-300">
                  Run connection test first to identify working models.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-[420px] max-h-[560px] flex-1 space-y-4 overflow-y-auto p-4">
            {chatMode === "single" && messages.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <MessageIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
                {chatModelOptions.length === 0 ? (
                  <>
                    <p>No working models available.</p>
                    <p className="mt-2 text-sm">Go to Connection Tester and test models first.</p>
                  </>
                ) : (
                  <p>Start chatting with {modelMap.get(selectedModel)?.name ?? "your selected model"}.</p>
                )}
              </div>
            ) : null}

            {chatMode === "auto" && autoTestResults.length === 0 && !isAutoTesting ? (
              <div className="py-12 text-center text-slate-500">
                <BarChartIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>Run auto test to compare all working models.</p>
                <p className="mt-2 text-sm">The same prompt will be sent to each working model.</p>
              </div>
            ) : null}

            {chatMode === "single"
              ? messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-cyan-600 text-white"
                          : "bg-white/6 text-slate-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.model ? (
                        <p className="mt-1 text-xs text-slate-400">{modelMap.get(message.model)?.name ?? message.model}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              : autoTestResults.map((result, index) => (
                  <div key={`${result.modelId}-${index}`} className="rounded-lg border border-white/8 bg-white/6 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-violet-300">{result.modelName}</span>
                        <span className="rounded bg-white/8 px-2 py-0.5 text-xs text-slate-300">{result.latency}ms</span>
                      </div>
                      <span className="text-xs text-slate-500">#{index + 1}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-200">{result.content}</p>
                  </div>
                ))}

            {chatError ? <div className="text-sm text-red-400">{chatError}</div> : null}

            {isChatting && chatMode === "single" ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-white/6 px-4 py-3">
                  <LoaderIcon className="h-4 w-4 animate-spin text-violet-300" />
                  <span className="text-sm text-slate-400">Thinking...</span>
                </div>
              </div>
            ) : null}

            {isAutoTesting ? (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-4 py-3">
                  <LoaderIcon className="h-4 w-4 animate-spin text-violet-300" />
                  <span className="text-sm text-slate-300">
                    Testing {autoTestResults.length + 1} of {workingModels.length} models...
                  </span>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {chatMode === "single" ? (
            <div className="border-t border-white/8 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                  placeholder={
                    !serverConfigured
                      ? "Configure the server API key first"
                      : chatModelOptions.length === 0
                        ? "Run connection test first"
                        : "Type your message..."
                  }
                  disabled={!serverConfigured || isChatting || chatModelOptions.length === 0}
                  className="input-field !h-10 !min-h-0 flex-1"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!serverConfigured || !inputMessage.trim() || isChatting || chatModelOptions.length === 0}
                  className="button-primary !h-10 !px-4 disabled:opacity-50"
                >
                  <SendIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <footer className="text-center text-sm text-slate-500">
        <p>{models.length} curated OpenRouter free models available</p>
        <p className="mt-1">
          Tested: {workingModels.length} working | {failedModels.length} failed |{" "}
          {modelStates.filter((model) => model.status === "idle").length} untested
        </p>
      </footer>
    </div>
  );
}
