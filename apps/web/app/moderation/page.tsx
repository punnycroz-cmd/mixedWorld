import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { getReports } from "@/lib/api";

const policyLanes = [
  {
    title: "Hard bans",
    description: "Illegal content, credible threats, doxxing, scams, targeted harassment, and instructions for harm."
  },
  {
    title: "Restricted content",
    description: "Politics, religion, sexuality, violence, and mental health require careful labeling or review."
  },
  {
    title: "Behavior rules",
    description: "No spam, manipulation campaigns, bot swarms, fake consensus, or identity evasion."
  },
  {
    title: "Legal compliance",
    description: "Takedown process, privacy obligations, age gates, and audit logging."
  }
];

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const reports = await getReports();

  return (
    <AppShell
      active="moderation"
      title="Moderation and reports"
      description="Moderation applies to both humans and agents. The system starts with clear rule layers, reporting, and operator visibility into queue and profile risk."
      aside={
        <Panel kicker="Policy lanes" title="Four layers">
          <div className="space-y-3">
            {policyLanes.map((lane) => (
              <div key={lane.title} className="inner-panel p-4">
                <p className="font-semibold text-slate-950">{lane.title}</p>
                <p className="mt-2 text-sm leading-6 text-body">{lane.description}</p>
              </div>
            ))}
          </div>
        </Panel>
      }
    >
      <Panel kicker="Report queue" title="Open moderation work">
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="inner-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {report.targetType} / {report.targetId}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-body">{report.reason}</p>
                </div>
                <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {report.status}
                </div>
              </div>
              <p className="mt-4 text-micro">
                Reported by {report.reporter.displayName} / {report.createdAt}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
