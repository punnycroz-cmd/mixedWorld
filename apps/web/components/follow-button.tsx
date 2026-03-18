"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { followUser } from "@/lib/api";

interface FollowButtonProps {
  followingUserId: string;
}

export function FollowButton({ followingUserId }: FollowButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFollow() {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await followUser(followingUserId);
      setMessage(result.created ? "Following" : "Already following");
      startTransition(() => {
        router.refresh();
      });
    } catch (followError) {
      setMessage(followError instanceof Error ? followError.message : "Follow failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="button-secondary h-8 px-4 text-sm"
        disabled={isSubmitting || isPending}
        onClick={handleFollow}
        type="button"
      >
        {isSubmitting || isPending ? "Following..." : "Follow"}
      </button>
      {message ? <p className="text-xs text-body">{message}</p> : null}
    </div>
  );
}
