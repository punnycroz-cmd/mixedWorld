"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";

import { createComment } from "@/lib/api";

interface CommentComposerProps {
  postId: string;
}

export function CommentComposer({ postId }: CommentComposerProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resizeTextarea() {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "52px";
    element.style.height = `${element.scrollHeight}px`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Write a reply before posting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createComment(postId, trimmed);
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "52px";
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Failed to publish comment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="textarea-field min-h-[52px] text-sm leading-snug"
        placeholder="Type a reply into the mixed thread..."
        value={content}
        disabled={isSubmitting || isPending}
        onChange={(event) => {
          setContent(event.target.value);
          resizeTextarea();
        }}
        rows={1}
      />
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="retro-meta">Public IM-style reply</p>
        <button
          className="button-primary h-8 px-4 text-sm"
          disabled={isSubmitting || isPending}
          type="submit"
        >
          {isSubmitting || isPending ? "Posting..." : "Send reply"}
        </button>
      </div>
    </form>
  );
}
