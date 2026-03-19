"use client";

import { useEffect, useRef, useState } from "react";

import { BotIcon, MessageIcon, UserIcon } from "@/components/icons";
import { Panel } from "@/components/panel";

interface Message {
  role: "user" | "assistant";
  content: string;
  reasoning_details?: string;
}

interface FreeModel {
  id: string;
  name: string;
  description?: string;
}

const CLIENT_TIMEOUT_MS = 95_000;

export function ChatInterface() {
  const [models, setModels] = useState<FreeModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setLoadingModels(true);
      setModelsError(null);
      try {
        const response = await fetch("/api/model-test", { cache: "no-store" });
        const data = (await response.json()) as {
          configured?: boolean;
          detail?: string;
          models?: FreeModel[];
        };

        if (!response.ok) {
          throw new Error(data.detail || "Could not load OpenRouter models.");
        }

        if (!data.configured) {
          throw new Error(data.detail || "OpenRouter key is not configured on the server.");
        }

        const nextModels = data.models ?? [];
        if (!cancelled) {
          setModels(nextModels);
          setSelectedModel((current) => current || nextModels[0]?.id || "");
        }
      } catch (err) {
        if (!cancelled) {
          setModelsError(err instanceof Error ? err.message : "Could not load OpenRouter models.");
        }
      } finally {
        if (!cancelled) {
          setLoadingModels(false);
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedModel || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);
    setStatus(`Contacting ${models.find((model) => model.id === selectedModel)?.name ?? "model"}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "chat",
          model: selectedModel,
          messages: newMessages
        })
      });

      clearTimeout(timeout);
      const data = (await response.json()) as {
        detail?: string;
        message?: Message;
      };

      if (!response.ok) {
        throw new Error(data.detail || "Failed to get AI response.");
      }

      if (!data.message?.content) {
        throw new Error("Model returned no visible reply.");
      }

      setStatus("Model responded. Rendering reply...");
      setMessages([...newMessages, data.message]);
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      setError(
        isAbort
          ? "Chat request timed out after 95 seconds. Try Gemini 2.0 Flash first, then retry heavier free models."
          : err instanceof Error
            ? err.message
            : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  const selectedModelDescription = models.find((model) => model.id === selectedModel)?.description;

  return (
    <div className="flex min-h-[80vh] flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="glass-panel relative flex h-[75vh] flex-1 flex-col overflow-hidden rounded-xl border border-white/5">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 px-8 pt-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
                <MessageIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">Start a Conversation</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
                  This chat now uses the OpenRouter key saved on the server. Pick a free model and test it here.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
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
                            ? "rounded-tr-none bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/10"
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

        <div className="border-t border-white/5 bg-black/40 p-4 backdrop-blur-md">
          {modelsError ? (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <span className="mr-1 font-bold">Error:</span>
              {modelsError}
            </div>
          ) : null}
          {error ? (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <span className="mr-1 font-bold">Error:</span>
              {error}
            </div>
          ) : null}
          {loading && status ? (
            <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300">
              <span className="mr-1 font-bold">Status:</span>
              {status}
            </div>
          ) : null}

          <form onSubmit={handleSend} className="group relative">
            <input
              className="input-field !bg-white/5 !pr-24 transition-all duration-300 group-hover:!bg-white/10 focus:!bg-white/10"
              placeholder={
                loadingModels
                  ? "Loading free models..."
                  : modelsError
                    ? "Fix model loading before chatting..."
                    : "Type your message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || loadingModels || !!modelsError || !selectedModel}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <button
                type="submit"
                className="button-primary !h-8 !px-4 !text-xs transition-all duration-300 disabled:opacity-50"
                disabled={loading || loadingModels || !!modelsError || !selectedModel || !input.trim()}
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-500">
            {selectedModelDescription
              ? selectedModelDescription
              : "Free OpenRouter models are loaded from the server and use your saved secret key."}
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 space-y-4 lg:w-80">
        <Panel kicker="Settings" title="Configuration">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Select Model
              </label>
              <select
                className="input-field !h-9 !min-h-0"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={loadingModels || !!modelsError || models.length === 0}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <button className="button-secondary w-full" onClick={() => setMessages([])}>
              Reset Chat
            </button>
          </div>
        </Panel>

        <Panel kicker="Tips" title="Server-managed key">
          <p className="text-xs leading-relaxed text-slate-400">
            This chat uses the OpenRouter key configured in your server environment, not a browser-pasted key.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            If a free model hangs, use the new <strong>Test Model Connection</strong> section to find the fastest working option first.
          </p>
        </Panel>
      </div>
    </div>
  );
}
