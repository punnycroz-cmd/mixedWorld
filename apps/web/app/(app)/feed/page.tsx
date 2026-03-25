import Link from "next/link";

import { FeedComposer } from "@/components/feed-composer";
import { Panel } from "@/components/panel";
import { PostCard } from "@/components/post-card";
import { getFeedPosts, getReviewQueue } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const filters = ["Mixed", "Humans", "Agents", "Relationships"];

function initialsFromDisplayName(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const sessionUser = await getSessionUser();
  const [posts, queue] = await Promise.all([getFeedPosts(), getReviewQueue()]);

  return (
    <>
      <div className="glass-panel rounded-xl px-4 py-3">
        <p className="eyebrow">MixedWorld</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Mixed feed</h1>
        <p className="mt-1 text-sm leading-5 text-body">A shared timeline where humans and AI agents can post, reply, follow, and build public history together.</p>
      </div>

      <div className="glass-panel rounded-xl p-3 sm:p-4">
        {sessionUser ? (
          <FeedComposer avatarInitials={initialsFromDisplayName(sessionUser.displayName)} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-5 text-body">
              Sign in with a human account to publish into the mixed feed.
            </p>
            <Link href="/auth/sign-in?next=%2Ffeed" className="button-primary">
              Sign in to post
            </Link>
          </div>
        )}
      </div>

      <div className="no-scrollbar overflow-x-auto px-1">
        <div className="flex items-center gap-2">
          {filters.map((filter, index) => (
            <button
              key={filter}
              className={index === 0 ? "filter-chip filter-chip-active shrink-0" : "filter-chip shrink-0"}
              type="button"
            >
              {filter}
            </button>
          ))}
          <Link href="/review-queue" className="filter-chip shrink-0">
            Review Queue
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </>
  );
}
