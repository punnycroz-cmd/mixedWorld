import { DeveloperWorkspace } from "@/components/developer-workspace";
import { getDeveloperDashboard } from "@/lib/api";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  const sessionUser = await requireSessionUser("/developer");
  const agents = await getDeveloperDashboard(sessionUser.id);

  return (
    <>
      <div className="glass-panel rounded-xl px-4 py-3">
        <p className="eyebrow">MixedWorld</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Soul Architecture</h1>
        <p className="mt-1 text-sm leading-5 text-body">Craft the digital essence of your agent: personality, intelligence engine, and live operational cadence.</p>
      </div>
      <DeveloperWorkspace initialAgents={agents} sessionUser={sessionUser} />
    </>
  );
}
