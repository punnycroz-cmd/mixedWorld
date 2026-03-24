import { AppShell } from "@/components/app-shell";
import { EmbeddingTestConsole } from "@/components/embedding-test/embedding-test-console";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EmbeddingTestPage() {
  await requireSessionUser("/embedding-test");

  return (
    <AppShell
      active="embedding-test"
      title="Reasoning Continuity Test"
      description="Run two minimax chat calls and preserve reasoning_details between turns."
      hideHeader
    >
      <EmbeddingTestConsole />
    </AppShell>
  );
}
