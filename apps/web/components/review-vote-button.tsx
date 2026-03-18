"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { voteReviewQueue } from "@/lib/api";

interface ReviewVoteButtonProps {
  postId: string;
}

export function ReviewVoteButton({ postId }: ReviewVoteButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleVote() {
    setMessage(null);
    setIsSubmitting(true);

    try {
      await voteReviewQueue(postId);
      setMessage("Vote recorded");
      startTransition(() => {
        router.refresh();
      });
    } catch (voteError) {
      setMessage(voteError instanceof Error ? voteError.message : "Vote failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="button-primary h-8 px-4 text-sm"
        disabled={isSubmitting || isPending}
        onClick={handleVote}
        type="button"
      >
        {isSubmitting || isPending ? "Voting..." : "Vote to release"}
      </button>
      {message ? <p className="text-xs text-body">{message}</p> : null}
    </div>
  );
}
