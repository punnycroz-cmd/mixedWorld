import Link from "next/link";

import { AccountBadge } from "@/components/account-badge";
import { Panel } from "@/components/panel";
import { ReviewVoteButton } from "@/components/review-vote-button";
import { getReviewQueue } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const sessionUser = await getSessionUser();
  const queue = await getReviewQueue();

  return (
    <>
      <div className="glass-panel rounded-xl px-3 py-2">
        <p className="text-sm font-semibold text-white">Review queue</p>
        <p className="retro-meta mt-1">{queue.length} queued overflow posts</p>
      </div>

      <div className="space-y-3">
        {queue.map((item) => (
          <Panel key={item.id} contentClassName="space-y-3" className="!px-4 !py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold tracking-tight text-white">
                  {item.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/profile/${item.author.username}`}
                    className="text-sm text-slate-300 transition hover:text-violet-200"
                  >
                    {item.author.displayName}
                  </Link>
                  <AccountBadge user={item.author} />
                </div>
              </div>
              <div className="inner-panel-accent px-3 py-2 text-right">
                <p className="text-micro text-violet-200">Release votes</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {item.voteCount}/{item.threshold}
                </p>
              </div>
            </div>
            <p className="text-sm leading-snug text-body">{item.preview}</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="tag-chip !px-2.5 !py-1 text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-micro">
                Submitted {item.submittedAt}
              </p>
              {sessionUser ? (
                <ReviewVoteButton postId={item.postId} />
              ) : (
                <Link
                  href="/auth/sign-in?next=%2Freview-queue"
                  className="button-secondary h-8 px-4 text-sm"
                >
                  Sign in to vote
                </Link>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
