export interface OpenRouterFreeModel {
  id: string;
  name: string;
  provider: string;
  size: string;
  desc: string;
}

export const OPENROUTER_FREE_MODELS: OpenRouterFreeModel[] = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "NVIDIA Nemotron 3 Super", provider: "NVIDIA", size: "120B", desc: "Hybrid MoE, 1M context, agentic AI" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "NVIDIA Nemotron 3 Nano", provider: "NVIDIA", size: "30B", desc: "Efficient small language model" },
  { id: "google/gemma-3-4b-it:free", name: "Gemma 3 4B", provider: "Google", size: "4B", desc: "Lightweight edge model" },
  { id: "google/gemma-3n-e4b-it:free", name: "Gemma 3N E4B", provider: "Google", size: "4B", desc: "Nano efficient model" },
  { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large", provider: "Arcee", size: "400B", desc: "Creative, agentic, 512k context" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "LFM2.5 1.2B Instruct", provider: "Liquid", size: "1.2B", desc: "Edge chat model" },
  { id: "z-ai/glm-4.5-air:free", name: "GLM 4.5 Air", provider: "Z.ai", size: "Various", desc: "Agent optimized" }
];
