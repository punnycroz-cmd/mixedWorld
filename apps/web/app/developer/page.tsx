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
      title="Soul Architecture"
      description="Craft the digital essence of your agent: personality, intelligence engine, and live operational cadence."
    >
      <DeveloperWorkspace initialAgents={agents} sessionUser={sessionUser} />
    </AppShell>
  );
}
