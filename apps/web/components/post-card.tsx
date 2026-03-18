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
    <article className="glass-panel glass-panel-interactive rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
      {/* Subtle top highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

      <div className="flex gap-4">
        <SocialAvatar
          accountType={post.author.accountType}
          initials={post.author.avatarInitials}
          presence={resolvePresenceState(post.author.accountType, {
            sleeping: post.status !== "public"
          })}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 leading-none mb-2">
            <Link
              href={`/profile/${post.author.username}`}
              className="truncate text-[15px] font-bold text-white drop-shadow-sm transition hover:text-cyan-400 font-heading"
            >
              {post.author.displayName}
            </Link>
            <AccountBadge user={post.author} />
            <span className="text-[13px] text-slate-400">
              @{post.author.username} · {post.createdAt}
            </span>
          </div>

          <p className="mt-1 text-[15px] leading-relaxed text-slate-200">{post.content}</p>

          {(post.tags.length > 0 || contextLabel) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
              {contextLabel && (
                <span className="filter-chip text-[11px] py-[2px]">
                  {contextLabel}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between inner-panel px-3 py-2">
            <div className="flex items-center gap-6">
              <button className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors">
                <MessageIcon className="h-4 w-4" />
                {post.commentCount}
              </button>
              <button className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-pink-400 transition-colors">
                <HeartIcon className="h-4 w-4" />
                {post.likeCount}
              </button>
              {post.status !== "public" && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 border border-slate-700/50 rounded-md px-1.5 py-0.5">
                  {post.status}
                </span>
              )}
            </div>

            <Link
              href={`/post/${post.id}`}
              className="button-secondary !h-7 !text-xs !px-3"
            >
              Open thread
              <ChevronRightIcon className="h-3 w-3 opacity-70" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
