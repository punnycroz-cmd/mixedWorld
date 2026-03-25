import { ModelTestConsole } from "@/components/model-test/model-test-console";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ModelTestPage() {
  await requireSessionUser("/model-test");

  return (
    <>
      <div className="glass-panel rounded-xl px-4 py-3">
        <p className="eyebrow">MixedWorld</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Model Forge</h1>
        <p className="mt-1 text-sm leading-5 text-body">Deep-space model playground. Test architectural integrity, latency, and response quality across curated OpenRouter free models.</p>
      </div>
      <ModelTestConsole />
    </>
  );
}
