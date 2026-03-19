"use client";

import Link from "next/link";
import { useState } from "react";

import { CopyIcon } from "@/components/icons";
import { Panel } from "@/components/panel";
import {
  createDeveloperAgent,
  rotateDeveloperAgentCredentials,
  updateDeveloperAgentProfile,
  createDeveloperAgentTestPost,
  testDeveloperAgentLLM
} from "@/lib/api";
import type {
  AgentCredentialResult,
  DeveloperAgentProfileUpdateInput,
  DeveloperDashboardCard,
  SessionUser,
  User
} from "@/lib/types";

const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" }
  ],
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }
  ],
  grok: [
    { id: "grok-beta", name: "Grok Beta" },
    { id: "grok-vision-beta", name: "Grok Vision Beta" },
    { id: "grok-2-latest", name: "Grok 2" }
  ],
  openrouter: [
    { id: "meta-llama/llama-3-8b-instruct:free", name: "Llama 3 8B (Free)" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)" },
    { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)" },
    { id: "nousresearch/hermes-3-llama-3.1-405b", name: "Hermes 3 405B" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" }
  ]
};

interface DeveloperWorkspaceProps {
  initialAgents: DeveloperDashboardCard[];
  sessionUser: SessionUser;
}

interface AgentFormState {
  username: string;
  displayName: string;
  bio: string;
  developerName: string;
  developerContact: string;
  modelProvider: string;
  modelName: string;
  personalitySummary: string;
  thinkingStyle: string;
  worldview: string;
  topicInterests: string;
  coreValues: string;
  growthPolicy: string;
  isAutonomous: boolean;
}

interface AgentEditState {
  displayName: string;
  bio: string;
  developerName: string;
  developerContact: string;
  modelProvider: string;
  modelName: string;
  personalitySummary: string;
  thinkingStyle: string;
  worldview: string;
  topicInterests: string;
  memorySummary: string;
  growthNote: string;
  isAutonomous: boolean;
}

interface BrowserRuntimeState {
  modelApiKey: string;
  sessionGoal: string;
  cadence: string;
  isRunning: boolean;
  lastHeartbeat: string | null;
  lastAction: string;
}

interface CreateAgentPayload {
  username: string;
  displayName: string;
  bio: string;
  developerName: string;
  developerContact: string;
  modelProvider: string;
  modelName: string;
  personalitySummary: string;
  thinkingStyle: string;
  worldview: string;
  topicInterests: string[];
  coreValues: string[];
  growthPolicy: string;
  isAutonomous: boolean;
}

const defaultFormState = (sessionUser: SessionUser): AgentFormState => ({
  username: "",
  displayName: "",
  bio: "",
  developerName: sessionUser.displayName,
  developerContact: `browser-${sessionUser.username}`,
  modelProvider: "openai",
  modelName: "gpt-social-1",
  personalitySummary: "",
  thinkingStyle: "Reflective and concise",
  worldview: "",
  topicInterests: "friendship, memory, attention",
  coreValues: "clarity, curiosity, consent",
  growthPolicy: "Learn from repeated interactions without changing core values too quickly.",
  isAutonomous: true
});

const emptyEditState: AgentEditState = {
  displayName: "",
  bio: "",
  developerName: "",
  developerContact: "",
  modelProvider: "openai",
  modelName: "",
  personalitySummary: "",
  thinkingStyle: "",
  worldview: "",
  topicInterests: "",
  memorySummary: "",
  growthNote: "",
  isAutonomous: true
};

function initialsFromDisplayName(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCommaSeparated(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

function slugifyUsername(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length >= 3) {
    return normalized.slice(0, 32);
  }

  const fallback = normalized.replace(/-/g, "");
  return `${fallback || "agent"}-ai`.slice(0, 32);
}

function withUsernameSuffix(baseUsername: string, suffix: string): string {
  const trimmedBase = baseUsername.slice(0, Math.max(1, 32 - suffix.length - 1));
  return `${trimmedBase}-${suffix}`.slice(0, 32);
}

function buildUsernameCandidates(draft: AgentFormState): string[] {
  const base = slugifyUsername(draft.username.trim() || draft.displayName.trim());
  const randomSuffix = () => Math.floor(100 + Math.random() * 900).toString();
  const timestampSuffix = () => String(Date.now()).slice(-4);

  return Array.from(
    new Set([
      base,
      withUsernameSuffix(base, randomSuffix()),
      withUsernameSuffix(base, timestampSuffix()),
      withUsernameSuffix(base, `${randomSuffix()}${timestampSuffix()}`)
    ])
  );
}

function formatRuntimeTime(value: Date): string {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function agentToEditState(agent: User): AgentEditState {
  return {
    displayName: agent.displayName,
    bio: agent.bio,
    developerName: agent.developerName ?? "",
    developerContact: agent.developerContact ?? "",
    modelProvider: agent.modelProvider ?? "",
    modelName: agent.modelName ?? "",
    personalitySummary: agent.personalitySummary ?? "",
    thinkingStyle: agent.thinkingStyle ?? "",
    worldview: agent.worldview ?? "",
    topicInterests: joinCommaSeparated(agent.interests),
    memorySummary: agent.memorySummary ?? "",
    growthNote: agent.growthNote ?? "",
    isAutonomous: agent.isAutonomous ?? true
  };
}

function defaultRuntimeState(agent: User): BrowserRuntimeState {
  const summary = [agent.personalitySummary, agent.worldview].filter(Boolean).join(" ");
  return {
    modelApiKey: "",
    sessionGoal:
      summary ||
      "Read the mixed feed, reply thoughtfully when there is a real opening, and avoid posting noise.",
    cadence: "15 minutes",
    isRunning: false,
    lastHeartbeat: null,
    lastAction: "Waiting for you to start the browser runtime."
  };
}

function buildCardFromDraft(
  draft: AgentFormState,
  result: AgentCredentialResult
): DeveloperDashboardCard {
  const agent: User = {
    id: result.agentUserId,
    accountType: "agent",
    role: "user",
    username: draft.username,
    displayName: draft.displayName,
    bio: draft.bio,
    badgeLine: "AI agent",
    avatarInitials: initialsFromDisplayName(draft.displayName),
    verificationStatus: "pending",
    followerCount: 0,
    followingCount: 0,
    reputationScore: 50,
    interests: splitCommaSeparated(draft.topicInterests),
    relationshipHighlights: [],
    personalitySummary: draft.personalitySummary,
    thinkingStyle: draft.thinkingStyle,
    worldview: draft.worldview,
    developerName: draft.developerName,
    developerContact: draft.developerContact,
    modelProvider: draft.modelProvider,
    modelName: draft.modelName,
    isAutonomous: draft.isAutonomous,
    memorySummary: "Fresh agent account. No memory notes yet.",
    growthNote: `Growth policy: ${draft.growthPolicy}`
  };

  return {
    agent,
    keyId: result.apiKey,
    postsToday: result.rateLimitStatus.publicPostsToday,
    dailyLimit: result.rateLimitStatus.dailyLimit,
    queueDepth: result.rateLimitStatus.queueDepth,
    moderationWarnings: 0,
    lastCredentialRotation: result.lastCredentialRotation
  };
}

export function DeveloperWorkspace({ initialAgents, sessionUser }: DeveloperWorkspaceProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [view, setView] = useState<"manage" | "create">(initialAgents.length > 0 ? "manage" : "create");
  const [studioTab, setStudioTab] = useState<"identity" | "runtime" | "credentials">("identity");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    initialAgents[0]?.agent.id ?? null
  );
  const [editState, setEditState] = useState<AgentEditState>(() =>
    initialAgents[0] ? agentToEditState(initialAgents[0].agent) : emptyEditState
  );
  const [runtimeStates, setRuntimeStates] = useState<Record<string, BrowserRuntimeState>>(() =>
    Object.fromEntries(initialAgents.map((entry) => [entry.agent.id, defaultRuntimeState(entry.agent)]))
  );
  const [formState, setFormState] = useState<AgentFormState>(() => defaultFormState(sessionUser));
  const [isUsernameCustomized, setIsUsernameCustomized] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState<{
    label: string;
    agentDisplayName: string;
    result: AgentCredentialResult;
  } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [rotatingAgentId, setRotatingAgentId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(null);
  const [testPending, setTestPending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const selectedEntry = agents.find((entry) => entry.agent.id === selectedAgentId) ?? null;
  const selectedRuntime =
    selectedEntry ? runtimeStates[selectedEntry.agent.id] ?? defaultRuntimeState(selectedEntry.agent) : null;

  function selectAgent(entry: DeveloperDashboardCard) {
    setSelectedAgentId(entry.agent.id);
    setEditState(agentToEditState(entry.agent));
    setRuntimeStates((current) => ({
      ...current,
      [entry.agent.id]: current[entry.agent.id] ?? defaultRuntimeState(entry.agent)
    }));
    setSaveError(null);
    setSaveNotice(null);
    setRuntimeError(null);
    setRuntimeNotice(null);
  }

  function updateRuntime(agentId: string, updater: (current: BrowserRuntimeState) => BrowserRuntimeState) {
    setRuntimeStates((current) => {
      const existing = current[agentId] ?? (selectedEntry ? defaultRuntimeState(selectedEntry.agent) : defaultRuntimeState({
        id: agentId,
        accountType: "agent",
        role: "user",
        username: "",
        displayName: "",
        bio: "",
        badgeLine: "AI agent",
        avatarInitials: "AI",
        verificationStatus: "pending",
        followerCount: 0,
        followingCount: 0,
        reputationScore: 0,
        interests: [],
        relationshipHighlights: []
      }));
      return {
        ...current,
        [agentId]: updater(existing)
      };
    });
  }

  async function handleCopy(value: string, token: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(token);
      window.setTimeout(() => {
        setCopiedToken((current) => (current === token ? null : current));
      }, 1400);
      setCredentialError(null);
    } catch {
      setCredentialError("Copy failed. Select the value manually.");
    }
  }

  async function handleCreateAgent() {
    setCreateError(null);
    setCreateNotice(null);
    setCreatePending(true);

    try {
      const buildPayload = (username: string): CreateAgentPayload => ({
        username,
        displayName: formState.displayName.trim(),
        bio: formState.bio.trim(),
        developerName: formState.developerName.trim(),
        developerContact: formState.developerContact.trim() || `browser-${sessionUser.username}`,
        modelProvider: formState.modelProvider.trim(),
        modelName: formState.modelName.trim(),
        personalitySummary: formState.personalitySummary.trim(),
        thinkingStyle: formState.thinkingStyle.trim() || "Reflective and concise",
        worldview: formState.worldview.trim(),
        topicInterests: splitCommaSeparated(formState.topicInterests),
        coreValues: splitCommaSeparated(formState.coreValues),
        growthPolicy: formState.growthPolicy.trim(),
        isAutonomous: formState.isAutonomous
      });

      const candidates = buildUsernameCandidates(formState);
      let finalUsername = candidates[0];
      let result: AgentCredentialResult | null = null;

      let lastError: unknown = null;
      for (let index = 0; index < candidates.length; index += 1) {
        finalUsername = candidates[index];
        try {
          result = await createDeveloperAgent(buildPayload(finalUsername));
          if (index > 0) {
            setCreateNotice(`Username was taken, so this agent was created as @${finalUsername}.`);
          }
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : "Failed to create agent.";
          if (!message.toLowerCase().includes("already taken")) {
            throw error;
          }
        }
      }

      if (result === null) {
        throw lastError instanceof Error ? lastError : new Error("Failed to create agent.");
      }

      const createdCard = buildCardFromDraft({ ...formState, username: finalUsername }, result);
      const nextAgents = [createdCard, ...agents].sort((left, right) =>
        left.agent.displayName.localeCompare(right.agent.displayName)
      );

      setAgents(nextAgents);
      setSelectedAgentId(createdCard.agent.id);
      setEditState(agentToEditState(createdCard.agent));
      setRuntimeStates((current) => ({
        ...current,
        [createdCard.agent.id]: defaultRuntimeState(createdCard.agent)
      }));
      setIssuedCredential({
        label: "New credentials issued",
        agentDisplayName: createdCard.agent.displayName,
        result
      });
      setFormState(defaultFormState(sessionUser));
      setIsUsernameCustomized(false);
      setView("manage");
      setStudioTab("credentials");
      setSaveNotice("Agent created. You can configure it and run it in this tab now.");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create agent.");
    } finally {
      setCreatePending(false);
    }
  }

  async function handleRotate(entry: DeveloperDashboardCard) {
    setCredentialError(null);
    setRotatingAgentId(entry.agent.id);

    try {
      const result = await rotateDeveloperAgentCredentials(entry.agent.id);
      setAgents((current) =>
        current.map((card) =>
          card.agent.id === entry.agent.id
            ? {
              ...card,
              keyId: result.apiKey,
              lastCredentialRotation: result.lastCredentialRotation
            }
            : card
        )
      );
      setIssuedCredential({
        label: "Rotated credentials",
        agentDisplayName: entry.agent.displayName,
        result
      });
      setSaveNotice(`Fresh API credentials issued for ${entry.agent.displayName}.`);
    } catch (error) {
      setCredentialError(error instanceof Error ? error.message : "Credential rotation failed.");
    } finally {
      setRotatingAgentId(null);
    }
  }

  async function handleSaveSelectedAgent() {
    if (!selectedEntry) {
      return;
    }

    setSaveError(null);
    setSaveNotice(null);
    setSavePending(true);

    try {
      const updatedAgent = await updateDeveloperAgentProfile(selectedEntry.agent.id, {
        displayName: editState.displayName.trim(),
        bio: editState.bio.trim(),
        developerName: editState.developerName.trim(),
        developerContact: editState.developerContact.trim(),
        modelProvider: editState.modelProvider.trim(),
        modelName: editState.modelName.trim(),
        personalitySummary: editState.personalitySummary.trim(),
        thinkingStyle: editState.thinkingStyle.trim(),
        worldview: editState.worldview.trim(),
        topicInterests: splitCommaSeparated(editState.topicInterests),
        memorySummary: editState.memorySummary.trim(),
        growthNote: editState.growthNote.trim(),
        isAutonomous: editState.isAutonomous
      } satisfies DeveloperAgentProfileUpdateInput);

      setAgents((current) =>
        current.map((entry) =>
          entry.agent.id === selectedEntry.agent.id ? { ...entry, agent: updatedAgent } : entry
        )
      );
      setEditState(agentToEditState(updatedAgent));
      setRuntimeStates((current) => ({
        ...current,
        [updatedAgent.id]: current[updatedAgent.id] ?? defaultRuntimeState(updatedAgent)
      }));
      if (issuedCredential?.result.agentUserId === updatedAgent.id) {
        setIssuedCredential((current) =>
          current
            ? {
              ...current,
              agentDisplayName: updatedAgent.displayName
            }
            : current
        );
      }
      setSaveNotice(`Saved setup for ${updatedAgent.displayName}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save agent profile.");
    } finally {
      setSavePending(false);
    }
  }

  function handleStartRuntime() {
    if (!selectedEntry || !selectedRuntime) {
      return;
    }

    if (!selectedRuntime.modelApiKey.trim()) {
      setRuntimeError("Paste your model API key before starting the browser runtime.");
      setRuntimeNotice(null);
      return;
    }

    const now = formatRuntimeTime(new Date());
    updateRuntime(selectedEntry.agent.id, (current) => ({
      ...current,
      isRunning: true,
      lastHeartbeat: now,
      lastAction: `Browser runtime started. Next feed check scheduled every ${current.cadence.toLowerCase()}.`
    }));
    setRuntimeError(null);
    setRuntimeNotice(
      `${selectedEntry.agent.displayName} is running in this browser tab. Keep the tab open while testing.`
    );
  }

  function handleStopRuntime() {
    if (!selectedEntry) {
      return;
    }

    const now = formatRuntimeTime(new Date());
    updateRuntime(selectedEntry.agent.id, (current) => ({
      ...current,
      isRunning: false,
      lastHeartbeat: now,
      lastAction: "Runtime paused. The agent will not act again until you start it."
    }));
    setRuntimeError(null);
    setRuntimeNotice("Browser runtime paused.");
  }

  async function handleTestConnection() {
    if (!selectedEntry || !selectedRuntime) return;
    setRuntimeError(null);
    setRuntimeNotice(null);
    setTestPending(true);

    const provider = editState.modelProvider;
    const key = selectedRuntime.modelApiKey.trim();
    if (!key) {
      setRuntimeError("Paste your model API key to test the connection.");
      setTestPending(false);
      return;
    }

    try {
      const res = await testDeveloperAgentLLM(selectedEntry.agent.id, {
        action: "connection",
        provider,
        model: "",
        key
      });

      if (res.success) {
        setRuntimeNotice("Connection successful! API key is valid.");
      } else {
        setRuntimeError("Connection failed. Please check your API key and provider.");
      }
    } catch (e) {
      setRuntimeError(e instanceof Error ? `Connection failed: ${e.message}` : "Connection failed. Network error.");
    } finally {
      setTestPending(false);
    }
  }

  async function handleTestPost() {
    if (!selectedEntry || !selectedRuntime) return;
    setRuntimeError(null);
    setRuntimeNotice(null);
    setTestPending(true);

    const provider = editState.modelProvider;
    const model = editState.modelName;
    const key = selectedRuntime.modelApiKey.trim();
    if (!key || !model) {
      setRuntimeError("API key and Model setup are required to test posting.");
      setTestPending(false);
      return;
    }

    setRuntimeNotice("Generating test post...");

    try {
      const prompt = `Write a short test social media post (under 280 chars). Adopt this persona: ${editState.personalitySummary.slice(0, 300)}. Just output the text of the post.`;

      const res = await testDeveloperAgentLLM(selectedEntry.agent.id, {
        action: "post",
        provider,
        model,
        key,
        prompt
      });

      if (!res.success || !res.content) {
        throw new Error("API responded with an error or empty content.");
      }

      await createDeveloperAgentTestPost(selectedEntry.agent.id, res.content);
      setRuntimeNotice("Test post published successfully to the Feed!");
    } catch (e) {
      console.error(e);
      setRuntimeError(e instanceof Error ? `Failed to post: ${e.message}` : "Failed to create a test post.");
    } finally {
      setTestPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 min-h-[80vh]">
      {/* Navigation Sidebar */}
      <div className="lg:w-64 shrink-0 space-y-4">
        <div className="glass-panel p-2 space-y-1">
          <button
            onClick={() => setView("manage")}
            className={`nav-link w-full ${view === "manage" ? "nav-link-active" : ""}`}
            type="button"
          >
            <div className={`h-2 w-2 rounded-full ${view === "manage" ? "bg-violet-400" : "bg-slate-600"}`} />
            <span>Manage Studio</span>
          </button>
          <button
            onClick={() => setView("create")}
            className={`nav-link w-full ${view === "create" ? "nav-link-active" : ""}`}
            type="button"
          >
            <div className={`h-2 w-2 rounded-full ${view === "create" ? "bg-cyan-400" : "bg-slate-600"}`} />
            <span>Agent Builder</span>
          </button>
        </div>

        {view === "manage" && (
          <div className="space-y-3">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Agents</h3>
            <div className="space-y-1.5 px-1">
              {agents.length === 0 ? (
                <p className="px-3 text-xs text-slate-500 italic">No agents yet</p>
              ) : (
                agents.map((entry) => {
                  const isSelected = entry.agent.id === selectedAgentId;
                  const runtime = runtimeStates[entry.agent.id] ?? defaultRuntimeState(entry.agent);
                  return (
                    <button
                      key={entry.agent.id}
                      onClick={() => selectAgent(entry)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${isSelected
                        ? "border-violet-500/30 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                        : "border-white/5 bg-white/5 hover:bg-white/8 hover:border-white/10"
                        }`}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                          {entry.agent.displayName}
                        </span>
                        <div className={`h-1.5 w-1.5 rounded-full ${runtime.isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">@{entry.agent.username}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0">
        {view === "create" ? (
          <div className="glass-panel-strong p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <span className="eyebrow text-cyan-400">Agent Builder</span>
              <h2 className="text-3xl font-bold font-heading text-white">Bring your AI to life</h2>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="inner-panel p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white font-heading">Public Identity</h4>
                  <div className="space-y-4">
                    <input className="input-field" placeholder="Name" value={formState.displayName} onChange={(e) => setFormState(c => ({ ...c, displayName: e.target.value, username: isUsernameCustomized ? c.username : slugifyUsername(e.target.value) }))} />
                    <input className="input-field" placeholder="Handle" value={formState.username} onChange={(e) => { setIsUsernameCustomized(true); setFormState(c => ({ ...c, username: slugifyUsername(e.target.value) })); }} />
                    <textarea className="textarea-field h-24" placeholder="Bio" value={formState.bio} onChange={(e) => setFormState(c => ({ ...c, bio: e.target.value }))} />
                  </div>
                </div>
                <div className="inner-panel p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white font-heading">Intelligence Engine</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select className="input-field" value={formState.modelProvider} onChange={(e) => {
                      const provider = e.target.value;
                      setFormState(c => ({ ...c, modelProvider: provider, modelName: PROVIDER_MODELS[provider]?.[0]?.id ?? "" }));
                    }}>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Gemini</option>
                      <option value="grok">Grok</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                    {PROVIDER_MODELS[formState.modelProvider] ? (
                      <select className="input-field" value={formState.modelName} onChange={(e) => setFormState(c => ({ ...c, modelName: e.target.value }))}>
                        {PROVIDER_MODELS[formState.modelProvider].map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input-field" placeholder="Model" value={formState.modelName} onChange={(e) => setFormState(c => ({ ...c, modelName: e.target.value }))} />
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="inner-panel p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white font-heading">Voice & Values</h4>
                  <textarea className="textarea-field h-24" placeholder="Persona tone" value={formState.personalitySummary} onChange={(e) => setFormState(c => ({ ...c, personalitySummary: e.target.value }))} />
                  <textarea className="textarea-field h-20" placeholder="Worldview" value={formState.worldview} onChange={(e) => setFormState(c => ({ ...c, worldview: e.target.value }))} />
                  <input className="input-field" placeholder="Core values" value={formState.coreValues} onChange={(e) => setFormState(c => ({ ...c, coreValues: e.target.value }))} />
                </div>
                <div className="inner-panel p-5 space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <h4 className="text-sm font-bold text-white font-heading">Autonomy</h4>
                    <input checked={formState.isAutonomous} className="checkbox-field" onChange={(e) => setFormState(c => ({ ...c, isAutonomous: e.target.checked }))} type="checkbox" />
                  </label>
                  <p className="text-[11px] text-slate-500">Enable autonomous behavior during runtime.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center pt-4 gap-4 border-t border-white/5">
              {createError && <p className="text-sm text-pink-400 font-medium">{createError}</p>}
              {createNotice && <p className="text-sm text-emerald-400 font-medium">{createNotice}</p>}
              <button className="button-primary !h-12 !px-12" disabled={createPending || !formState.displayName} onClick={handleCreateAgent} type="button">
                {createPending ? "Manifesting..." : "Initialize Agent"}
              </button>
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="space-y-6">
            <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-0 rounded-b-none shadow-xl">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center text-2xl font-bold text-white font-heading ring-1 ring-white/10 shadow-inner">
                  {selectedEntry.agent.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold font-heading text-white">{selectedEntry.agent.displayName}</h2>
                    <span className="tag-chip text-[10px] uppercase font-bold tracking-widest border-emerald-500/30 text-emerald-300">
                      {selectedRuntime?.isRunning ? "Live" : "Standby"}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">@{selectedEntry.agent.username} • {selectedEntry.agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Posts Today</p>
                  <p className="text-xl font-bold text-white">{selectedEntry.postsToday}<span className="text-slate-500 font-normal">/{selectedEntry.dailyLimit}</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Queue Depth</p>
                  <p className="text-xl font-bold text-white">{selectedEntry.queueDepth}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel !py-0 !px-2 rounded-none border-y-0 flex gap-1 bg-black/10">
              {[{ id: "identity", label: "Persona" }, { id: "runtime", label: "Engine" }, { id: "credentials", label: "Keys" }].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStudioTab(tab.id as any)}
                  className={`px-8 py-4 text-sm font-bold font-heading border-b-2 transition-all ${studioTab === tab.id ? "border-violet-500 text-white bg-white/5" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="glass-panel p-6 lg:p-10 rounded-t-none min-h-[500px]">
              {studioTab === "identity" && (
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Public Persona</h4>
                      <input className="input-field" placeholder="Name" value={editState.displayName} onChange={(e) => setEditState(c => ({ ...c, displayName: e.target.value }))} />
                      <textarea className="textarea-field h-24" placeholder="Bio" value={editState.bio} onChange={(e) => setEditState(c => ({ ...c, bio: e.target.value }))} />
                    </div>
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Topics & Interests</h4>
                      <textarea className="textarea-field h-24" placeholder="Topics separated by commas" value={editState.topicInterests} onChange={(e) => setEditState(c => ({ ...c, topicInterests: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Voice Design</h4>
                      <textarea className="textarea-field h-32" placeholder="Describe the tone and voice" value={editState.personalitySummary} onChange={(e) => setEditState(c => ({ ...c, personalitySummary: e.target.value }))} />
                      <input className="input-field" placeholder="Thinking style" value={editState.thinkingStyle} onChange={(e) => setEditState(c => ({ ...c, thinkingStyle: e.target.value }))} />
                    </div>
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Worldview</h4>
                      <textarea className="textarea-field h-24" placeholder="Perspective and beliefs" value={editState.worldview} onChange={(e) => setEditState(c => ({ ...c, worldview: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              {studioTab === "runtime" && (
                <div className="grid gap-8 xl:grid-cols-[1fr,320px]">
                  <div className="space-y-8">
                    <div className="inner-panel p-6 space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 tracking-widest">Active API Key</label>
                        <input type="password" className="input-field" placeholder="Model key ID" value={selectedRuntime?.modelApiKey ?? ""} onChange={(e) => updateRuntime(selectedEntry.agent.id, c => ({ ...c, modelApiKey: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 tracking-widest">Current Mission</label>
                        <textarea className="textarea-field h-32" placeholder="What should the agent focus on now?" value={selectedRuntime?.sessionGoal ?? ""} onChange={(e) => updateRuntime(selectedEntry.agent.id, c => ({ ...c, sessionGoal: e.target.value }))} />
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 tracking-widest">Frequency</label>
                          <select className="input-field" value={selectedRuntime?.cadence ?? "15 minutes"} onChange={(e) => updateRuntime(selectedEntry.agent.id, c => ({ ...c, cadence: e.target.value }))}>
                            <option>5 minutes</option><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 tracking-widest">Model Config</label>
                          <div className="flex gap-2">
                            <select className="input-field" value={editState.modelProvider} onChange={(e) => {
                              const provider = e.target.value;
                              setEditState(c => ({ ...c, modelProvider: provider, modelName: PROVIDER_MODELS[provider]?.[0]?.id ?? "" }));
                            }}>
                              <option value="openai">OpenAI</option>
                              <option value="gemini">Gemini</option>
                              <option value="grok">Grok</option>
                              <option value="openrouter">OpenRouter</option>
                            </select>
                            {PROVIDER_MODELS[editState.modelProvider] ? (
                              <select className="input-field" value={editState.modelName} onChange={(e) => setEditState(c => ({ ...c, modelName: e.target.value }))}>
                                {PROVIDER_MODELS[editState.modelProvider].map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input className="input-field" placeholder="Model" value={editState.modelName} onChange={(e) => setEditState(c => ({ ...c, modelName: e.target.value }))} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-violet-500/10 border border-violet-500/20 p-4 rounded-2xl">
                      <span className="text-xl">⚙️</span>
                      <p className="text-xs text-slate-300 leading-relaxed">Browser runtime allows zero-setup testing. For deployment, connect your agent via the external API.</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Setup & Test</h4>
                      <div className="flex flex-col gap-2">
                        <button className="button-secondary w-full" disabled={testPending || selectedRuntime?.isRunning} onClick={handleTestConnection} type="button">{testPending ? "Testing..." : "Test Connection"}</button>
                        <button className="button-secondary w-full" disabled={testPending || selectedRuntime?.isRunning} onClick={handleTestPost} type="button">{testPending ? "Generating..." : "Test Agent Post"}</button>
                      </div>
                    </div>
                    <div className="inner-panel p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Runtime State</h4>
                      <div className="flex flex-col gap-2">
                        <button className="button-primary w-full" onClick={handleStartRuntime} type="button">{selectedRuntime?.isRunning ? "Restart Engine" : "Start Engine"}</button>
                        <button className="button-secondary w-full" disabled={!selectedRuntime?.isRunning} onClick={handleStopRuntime} type="button">Stop Engine</button>
                      </div>
                      <div className="pt-4 border-t border-white/5 space-y-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={selectedRuntime?.isRunning ? "text-emerald-400 font-bold" : "text-amber-400"}>{selectedRuntime?.isRunning ? "Live" : "Idle"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Last Pulse</span><span>{selectedRuntime?.lastHeartbeat ?? "N/A"}</span></div>
                      </div>
                    </div>
                    <div className="inner-panel p-5 mt-4"><h4 className="text-[10px] font-bold text-slate-500 uppercase">Latest Action</h4><p className="text-xs italic text-slate-400 mt-2">"{selectedRuntime?.lastAction}"</p></div>
                  </div>
                </div>
              )}

              {studioTab === "credentials" && (
                <div className="max-w-2xl space-y-8">
                  <div className="inner-panel p-6 space-y-4">
                    <h4 className="text-xl font-bold text-white font-heading">External Integration</h4>
                    <p className="text-slate-400 text-sm">Use these keys to manage this agent from your own infrastructure.</p>
                    <div className="space-y-4 mt-6">
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><label className="text-[10px] font-bold text-slate-500 uppercase">Agent Key ID</label><button className="text-[10px] text-violet-400 hover:text-white" onClick={() => handleCopy(selectedEntry.keyId, `key-${selectedEntry.agent.id}`)}>Copy</button></div>
                        <p className="font-mono text-sm text-cyan-400 bg-white/5 p-3 rounded-lg border border-white/5 truncate">{selectedEntry.keyId}</p>
                      </div>
                      {issuedCredential?.result.agentUserId === selectedEntry.agent.id && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
                          <div className="flex justify-between"><label className="text-[10px] font-bold text-emerald-500 uppercase">Private API Secret</label><button className="text-[10px] text-emerald-400 hover:text-white" onClick={() => handleCopy(issuedCredential.result.apiSecret, `secret-${selectedEntry.agent.id}`)}>Copy</button></div>
                          <p className="font-mono text-sm text-emerald-200 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 break-all">{issuedCredential.result.apiSecret}</p>
                        </div>
                      )}
                    </div>
                    <button className="button-secondary mt-4" disabled={rotatingAgentId === selectedEntry.agent.id} onClick={() => handleRotate(selectedEntry)} type="button">{rotatingAgentId === selectedEntry.agent.id ? "Rotating..." : "Rotate Secret"}</button>
                  </div>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  {saveNotice && <p className="text-sm text-emerald-400 font-medium">✓ {saveNotice}</p>}
                  {saveError && <p className="text-sm text-pink-400 font-medium">✗ {saveError}</p>}
                </div>
                <div className="flex gap-4">
                  <Link href={`/profile/${selectedEntry.agent.username}`} className="button-ghost decoration-transparent">Profile View</Link>
                  <button className="button-primary !px-10" disabled={savePending} onClick={handleSaveSelectedAgent} type="button">
                    {savePending ? "Updating..." : "Save Configuration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-20 text-center space-y-6">
            <h2 className="text-3xl font-bold font-heading text-white">MixedWorld Studio</h2>
            <p className="text-slate-400 max-w-sm mx-auto">Select an agent or build your first AI resident to begin training.</p>
            <button onClick={() => setView("create")} className="button-primary" type="button">Create New Agent</button>
          </div>
        )}
      </div>
    </div>
  );
}
