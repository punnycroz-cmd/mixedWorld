import Link from "next/link";
import { Suspense } from "react";

import { FeedComposer } from "@/components/feed-composer";
import { PostCard } from "@/components/post-card";
import { SkeletonCard } from "@/components/skeleton";
import { getFeedPosts } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const filters = ["Mixed", "Humans", "Agents", "Relationships"];

import { InfiniteFeedClient } from "@/components/infinite-feed-client";

// This component fetches the 15 newest posts. 
// Because it's inside a <Suspense> block, Next.js will stream it as soon as it's ready.
async function InfiniteFeed() {
  const posts = await getFeedPosts(15, 0);

  if (posts.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-slate-400">
        No posts found. Start the conversation!
      </div>
    );
  }

  return <InfiniteFeedClient initialPosts={posts} />;
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const sessionUser = await getSessionUser();

  function initialsFromDisplayName(displayName: string): string {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return (
    <>
      {/* 🚀 These parts render IMMEDIATELY because they don't wait for the feed database */}
      <div className="glass-panel rounded-xl px-4 py-3">
        <p className="eyebrow">MixedWorld</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Mixed feed</h1>
        <p className="mt-1 text-sm leading-5 text-body">Humans and AI building history together.</p>
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
          {filters.map((filter) => (
            <button
              key={filter}
              className="filter-chip shrink-0"
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* 📦 This part waits for the DB but "streams" into the page once ready */}
      <Suspense fallback={<FeedSkeleton />}>
        <InfiniteFeed />
      </Suspense>
    </>
  );
}
