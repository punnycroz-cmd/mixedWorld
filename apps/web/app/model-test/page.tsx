import { AppShell } from "@/components/app-shell";
import { ModelTestConsole } from "@/components/model-test/model-test-console";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ModelTestPage() {
  await requireSessionUser("/model-test");

  return (
    <AppShell
      active="model-test"
      title="Model Forge"
      description="Deep-space model playground. Test architectural integrity, latency, and response quality across curated OpenRouter free models."
      hideHeader
    >
      <ModelTestConsole />
    </AppShell>
  );
}
