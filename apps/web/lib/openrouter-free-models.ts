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
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "NVIDIA Nemotron Nano 12B VL", provider: "NVIDIA", size: "12B", desc: "Multimodal, video understanding" },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "NVIDIA Nemotron Nano 9B", provider: "NVIDIA", size: "9B", desc: "Fast, efficient reasoning" },
  { id: "openai/gpt-oss-120b:free", name: "OpenAI GPT-OSS 120B", provider: "OpenAI", size: "120B", desc: "Open-weight model" },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI GPT-OSS 20B", provider: "OpenAI", size: "20B", desc: "Open-weight model" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta", size: "70B", desc: "Latest Llama instruct" },
  { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B", provider: "Meta", size: "3B", desc: "Fast, lightweight" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 Llama 405B", provider: "Nous", size: "405B", desc: "Large open model" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1", provider: "Mistral", size: "24B", desc: "Instruction tuned" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", provider: "Google", size: "27B", desc: "Latest Gemma instruct" },
  { id: "google/gemma-3-12b-it:free", name: "Gemma 3 12B", provider: "Google", size: "12B", desc: "Efficient instruction model" },
  { id: "google/gemma-3-4b-it:free", name: "Gemma 3 4B", provider: "Google", size: "4B", desc: "Lightweight edge model" },
  { id: "google/gemma-3n-e2b-it:free", name: "Gemma 3N E2B", provider: "Google", size: "2B", desc: "Nano efficient model" },
  { id: "google/gemma-3n-e4b-it:free", name: "Gemma 3N E4B", provider: "Google", size: "4B", desc: "Nano efficient model" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen3 Next 80B", provider: "Qwen", size: "80B", desc: "Fast stable responses" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder", provider: "Qwen", size: "Various", desc: "Code specialized" },
  { id: "qwen/qwen3-4b:free", name: "Qwen3 4B", provider: "Qwen", size: "4B", desc: "Lightweight Qwen" },
  { id: "minimax/minimax-m2.5:free", name: "MiniMax M2.5", provider: "MiniMax", size: "Large", desc: "Real-world productivity" },
  { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash", provider: "StepFun", size: "196B", desc: "MoE, speed efficient" },
  { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large", provider: "Arcee", size: "400B", desc: "Creative, agentic, 512k context" },
  { id: "arcee-ai/trinity-mini:free", name: "Trinity Mini", provider: "Arcee", size: "26B", desc: "Efficient reasoning, 131k context" },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", name: "LFM2.5 1.2B Thinking", provider: "Liquid", size: "1.2B", desc: "Edge reasoning, 32K context" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "LFM2.5 1.2B Instruct", provider: "Liquid", size: "1.2B", desc: "Edge chat model" },
  { id: "z-ai/glm-4.5-air:free", name: "GLM 4.5 Air", provider: "Z.ai", size: "Various", desc: "Agent optimized" },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name: "Dolphin Mistral 24B", provider: "Venice", size: "24B", desc: "Uncensored variant" }
];
