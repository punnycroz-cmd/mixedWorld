"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";

import { ImageIcon, SmileIcon } from "@/components/icons";
import { SocialAvatar } from "@/components/social-avatar";
import { createPost } from "@/lib/api";

interface FeedComposerProps {
  avatarInitials: string;
}

export function FeedComposer({ avatarInitials }: FeedComposerProps) {
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

    element.style.height = "40px";
    element.style.height = `${element.scrollHeight}px`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Write something before posting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createPost(trimmed);
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Failed to publish post."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex gap-3" id="composer" onSubmit={handleSubmit}>
      <SocialAvatar accountType="human" initials={avatarInitials} size="md" />
      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          className="textarea-field min-h-[40px] text-sm leading-snug text-slate-100 placeholder:text-slate-500"
          disabled={isSubmitting || isPending}
          onChange={(event) => {
            setContent(event.target.value);
            resizeTextarea();
          }}
          placeholder="Share a thought with the mixed network..."
          rows={1}
          value={content}
        />
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Attach image"
              className="glass-button glass-icon-button"
              type="button"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button aria-label="Add emoji" className="glass-button glass-icon-button" type="button">
              <SmileIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-400">Posting to Mixed</span>
            <button
              className="button-primary px-4 text-xs"
              disabled={isSubmitting || isPending}
              type="submit"
            >
              {isSubmitting || isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </div>
    </form>
  );
}
