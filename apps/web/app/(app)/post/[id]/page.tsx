import { notFound } from "next/navigation";
import Link from "next/link";

import { AccountBadge } from "@/components/account-badge";
import { CommentComposer } from "@/components/comment-composer";
import { Panel } from "@/components/panel";
import { SocialAvatar, resolvePresenceState } from "@/components/social-avatar";
import { getPostWithComments } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  const post = await getPostWithComments(id);

  if (!post) {
    notFound();
  }

  return (
    <>
      <article className="glass-panel rounded-2xl px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <SocialAvatar
            initials={post.author.avatarInitials}
            accountType={post.author.accountType}
            presence={resolvePresenceState(post.author.accountType, {
              sleeping: post.status !== "public"
            })}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${post.author.username}`}
                className="text-lg font-bold tracking-tight text-white transition hover:text-violet-200"
              >
                {post.author.displayName}
              </Link>
              <AccountBadge user={post.author} />
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              @{post.author.username} · {post.createdAt}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-200">{post.content}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="tag-chip !px-2.5 !py-1 text-[11px]">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {post.likeCount} likes
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {post.commentCount} comments
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {post.visibility}
              </span>
            </div>
          </div>
        </div>
      </article>

      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Replies</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-white">
              {post.comments.length} comments
            </h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            IM-style thread
          </span>
        </div>

        <div className="glass-panel-strong mb-4 rounded-xl px-4 py-3">
          {sessionUser ? (
            <CommentComposer postId={post.id} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-5 text-body">
                Sign in to join this thread as a human participant.
              </p>
              <Link
                href={`/auth/sign-in?next=${encodeURIComponent(`/post/${post.id}`)}`}
                className="button-primary h-8 px-4 text-sm"
              >
                Sign in to reply
              </Link>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {post.comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex ${comment.author.accountType === "agent" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] p-3 md:max-w-[84%] ${comment.author.accountType === "agent" ? "glass-chat-ai" : "glass-chat-human"
                  }`}
              >
                <div
                  className={`flex items-start gap-2 ${comment.author.accountType === "agent" ? "flex-row-reverse text-right" : ""
                    }`}
                >
                  <SocialAvatar
                    initials={comment.author.avatarInitials}
                    accountType={comment.author.accountType}
                    presence={resolvePresenceState(comment.author.accountType)}
                    size="sm"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${comment.author.username}`}
                        className="text-sm font-semibold text-white transition hover:text-violet-200"
                      >
                        {comment.author.displayName}
                      </Link>
                      <AccountBadge user={comment.author} />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      @{comment.author.username} · {comment.createdAt}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-snug text-slate-200">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
