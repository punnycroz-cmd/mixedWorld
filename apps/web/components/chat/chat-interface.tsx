"use client";

import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/panel";
import { MessageIcon, BotIcon, UserIcon } from "@/components/icons";

interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning_details?: string;
}

const FREE_MODELS = [
    { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash (Free)" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (Free)" },
    { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3 (Free)" },
    { id: "qwen/qwen3-30b-a3b:free", name: "Qwen 3 30B (Free)" },
];

export function ChatInterface() {
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || !apiKey.trim() || loading) return;

        const userMessage: Message = { role: "user", content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setError(null);
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    key: apiKey,
                    model: selectedModel,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Failed to get AI response");
            }

            const aiMessage = data.choices[0].message;
            setMessages([...newMessages, aiMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 min-h-[80vh]">
            <div className="flex-1 flex flex-col h-[75vh] glass-panel rounded-xl overflow-hidden relative border border-white/5">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8 pt-12">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <MessageIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-heading text-white">Start a Conversation</h3>
                                <p className="text-sm text-slate-400 max-w-xs mt-2 leading-relaxed">
                                    Enter your API key on the right and pick a free model to begin chatting.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[85%] flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 ${m.role === "user" ? "bg-cyan-500/20" : "bg-violet-500/20"}`}>
                                            {m.role === "user" ? <UserIcon className="w-4 h-4 text-cyan-400" /> : <BotIcon className="w-4 h-4 text-violet-400" />}
                                        </div>
                                        <div className="space-y-2">
                                            {m.reasoning_details && (
                                                <div className="text-[10px] font-mono text-slate-500 bg-black/40 p-2 rounded-lg border border-white/5 italic">
                                                    <span className="font-bold uppercase tracking-widest text-[8px] mb-1 block">Reasoning Process</span>
                                                    {m.reasoning_details}
                                                </div>
                                            )}
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                                                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/10 rounded-tr-none"
                                                    : "inner-panel text-slate-200 rounded-tl-none"
                                                }`}>
                                                {m.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-md">
                    {error && (
                        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 animate-in zoom-in-95 duration-200">
                            <span className="font-bold mr-1">Error:</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSend} className="relative group">
                        <input
                            className="input-field !pr-24 !bg-white/5 group-hover:!bg-white/10 focus:!bg-white/10 transition-all duration-300"
                            placeholder={!apiKey ? "Enter API key in settings sidebar..." : "Type your message..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || !apiKey}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button
                                type="submit"
                                className={`button-primary !h-8 !px-4 !text-xs transition-all duration-300 ${loading ? "opacity-50" : ""}`}
                                disabled={loading || !apiKey || !input.trim()}
                            >
                                {loading ? "Thinking..." : "Send"}
                            </button>
                        </div>
                    </form>
                    <div className="mt-2 text-[10px] text-slate-500 text-center">
                        Reasoning is automatically preserved for continued context.
                    </div>
                </div>
            </div>

            <div className="lg:w-80 shrink-0 space-y-4">
                <Panel kicker="Settings" title="Configuration">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OpenRouter API Key</label>
                            <input
                                type="password"
                                className="input-field !h-9 !min-h-0"
                                placeholder="sk-or-v1-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500">Your key is only sent to the OpenRouter proxy.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Model</label>
                            <select
                                className="input-field !h-9 !min-h-0"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                            >
                                {FREE_MODELS.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="button-secondary w-full"
                            onClick={() => setMessages([])}
                        >
                            Reset Chat
                        </button>
                    </div>
                </Panel>

                <Panel kicker="Tips" title="Reasoning">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Models like <strong>Step 3.5</strong> and <strong>Nemotron</strong> have reasoning enabled.
                        They will carefully think through complex questions like "strawberry r's".
                    </p>
                </Panel>
            </div>
        </div>
    );
}
