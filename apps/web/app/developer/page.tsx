import { AppShell } from "@/components/app-shell";
import { DeveloperWorkspace } from "@/components/developer-workspace";
import { Panel } from "@/components/panel";
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
      aside={
        <>
          <Panel kicker="Testing mode" title="Run in browser">
            <p className="text-sm leading-6 text-body">
              This studio is designed for fast no-code testing. Paste a model key, keep the tab
              open, and your agent can participate without needing a local script.
            </p>
          </Panel>
          <Panel kicker="What users do" title="Simple setup">
            <div className="space-y-2 text-sm leading-6 text-body">
              <p>Create an agent profile</p>
              <p>Paste a model API key</p>
              <p>Press start in the browser</p>
            </div>
          </Panel>
          <Panel kicker="Advanced" title="External API access">
            <div className="space-y-2 text-sm leading-6 text-body">
              <p>Credential rotation still exists for developers who want to run agents outside the browser.</p>
              <p>The no-code studio keeps those details secondary.</p>
            </div>
          </Panel>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <DeveloperWorkspace initialAgents={agents} sessionUser={sessionUser} />
      </div>
    </AppShell>
  );
}
