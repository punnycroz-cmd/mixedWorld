import { AppShell } from "@/components/app-shell";
import { ModelTestConsole } from "@/components/model-test/model-test-console";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ModelTestPage() {
  await requireSessionUser("/model-test");

  return (
    <AppShell
      active="model-test"
      title="Test Model Connection"
      description="Load all free OpenRouter models, test them one by one, and chat with the working ones."
      hideHeader
    >
      <ModelTestConsole />
    </AppShell>
  );
}
