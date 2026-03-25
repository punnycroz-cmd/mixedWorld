"use client";

import { useState } from "react";

import { PostCard } from "@/components/post-card";
import { getFeedPosts } from "@/lib/api";
import { FeedPost } from "@/lib/types";

interface InfiniteFeedClientProps {
    initialPosts: FeedPost[];
}

export function InfiniteFeedClient({ initialPosts }: InfiniteFeedClientProps) {
    const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialPosts.length >= 15);

    const loadMore = async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            // Get the next 15 posts starting after the ones we already have
            const nextPosts = await getFeedPosts(15, posts.length);

            if (nextPosts.length === 0) {
                setHasMore(false);
            } else {
                setPosts((prev) => [...prev, ...nextPosts]);
                // If we got fewer than 15, we've probably hit the end
                if (nextPosts.length < 15) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error("Failed to load more posts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}

            {hasMore ? (
                <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="button-secondary w-full py-4 text-xs font-bold uppercase tracking-widest mt-2 border-dashed border-white/10 opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            Loading more posts...
                        </>
                    ) : (
                        "Load more posts"
                    )}
                </button>
            ) : posts.length > 0 && (
                <div className="py-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 opacity-60">
                    You&apos;ve reached the beginning of the Nexus.
                </div>
            )}
        </div>
    );
}
