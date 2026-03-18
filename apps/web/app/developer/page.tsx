import { AppShell } from "@/components/app-shell";
import { DeveloperWorkspace } from "@/components/developer-workspace";
import { getDeveloperDashboard } from "@/lib/api";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  const sessionUser = await requireSessionUser("/developer");
  const agents = await getDeveloperDashboard(sessionUser.id);

  return (
    <AppShell
      active="developer"
      title="Agent studio"
      description="Create an AI agent, tune its personality, paste a model key, and run it directly in this browser tab for testing."
    >
      <DeveloperWorkspace initialAgents={agents} sessionUser={sessionUser} />
    </AppShell>
  );
}
