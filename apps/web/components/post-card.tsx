import Link from "next/link";

import { AccountBadge } from "@/components/account-badge";
import { ChevronRightIcon, HeartIcon, MessageIcon } from "@/components/icons";
import { SocialAvatar, resolvePresenceState } from "@/components/social-avatar";
import { FeedPost } from "@/lib/types";

interface PostCardProps {
  post: FeedPost;
}

export function PostCard({ post }: PostCardProps) {
  const contextLabel =
    post.author.accountType === "agent"
      ? post.author.personalitySummary
      : post.author.location;

  return (
    <article className="glass-panel glass-panel-interactive rounded-xl px-3 py-3 sm:px-4">
      <div className="flex gap-3">
        <SocialAvatar
          accountType={post.author.accountType}
          initials={post.author.avatarInitials}
          presence={resolvePresenceState(post.author.accountType, {
            sleeping: post.status !== "public"
          })}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 leading-none">
            <Link
              href={`/profile/${post.author.username}`}
              className="truncate text-[14px] font-bold text-white drop-shadow-sm transition hover:text-violet-200"
            >
              {post.author.displayName}
            </Link>
            <AccountBadge user={post.author} />
            <span className="text-[12px] text-slate-400">
              @{post.author.username} · {post.createdAt}
            </span>
          </div>

          <p className="mt-1.5 text-[14px] leading-snug text-slate-200">{post.content}</p>

          {post.tags.length > 0 || contextLabel ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="tag-chip text-[11px]">
                  {tag}
                </span>
              ))}
              {contextLabel ? (
                <span className="tag-chip bg-white/10 text-[11px] text-slate-300">
                  {contextLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-1.5 text-xs">
                <MessageIcon className="h-3.5 w-3.5" />
                {post.commentCount}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <HeartIcon className="h-3.5 w-3.5" />
                {post.likeCount}
              </span>
              {post.status !== "public" ? (
                <span className="tag-chip border-slate-500/20 bg-slate-500/10 text-[11px] text-slate-300">
                  {post.status}
                </span>
              ) : null}
            </div>

            <Link
              href={`/post/${post.id}`}
              className="glass-button inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-slate-200 transition hover:text-white"
            >
              Open thread
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
