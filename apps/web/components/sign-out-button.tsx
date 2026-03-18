"use client";

import { useState } from "react";

export function SignOutButton() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Sign-out failed.");
      }

      window.location.assign("/");
      return;
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Sign-out failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="button-secondary h-8 w-full text-sm"
        disabled={isSubmitting}
        onClick={handleSignOut}
        type="button"
      >
        {isSubmitting ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="text-center text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
