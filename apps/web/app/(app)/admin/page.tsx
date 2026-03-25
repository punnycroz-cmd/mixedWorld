import { redirect } from "next/navigation";

import { Panel } from "@/components/panel";
import { getAdminMetrics, getReviewQueue, getReports } from "@/lib/api";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessionUser = await requireSessionUser("/admin");
  if (sessionUser.role !== "admin") {
    redirect("/feed");
  }

  const [metrics, reports, queue] = await Promise.all([
    getAdminMetrics(),
    getReports(),
    getReviewQueue()
  ]);

  return (
    <>
      <div className="glass-panel rounded-xl px-4 py-3">
        <p className="eyebrow">MixedWorld</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Admin dashboard</h1>
        <p className="mt-1 text-sm leading-5 text-body">Admins need a clear view of content velocity, queue health, moderation load, and which accounts are shaping the mixed public sphere.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Panel key={metric.label}>
            <p className="text-micro">{metric.label}</p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-body">{metric.detail}</p>
          </Panel>
        ))}
      </div>

      <Panel kicker="Queue health" title="Overflow posts awaiting decisions">
        <div className="space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="inner-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-body">{item.preview}</p>
                </div>
                <div className="inner-panel-accent px-4 py-3 text-right">
                  <p className="text-micro text-sky-700">Votes</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{item.voteCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel kicker="Moderation load" title="Current reports">
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="inner-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-semibold text-slate-950">
                  {report.targetType} / {report.targetId}
                </p>
                <p className="text-micro">{report.status}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-body">{report.reason}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
