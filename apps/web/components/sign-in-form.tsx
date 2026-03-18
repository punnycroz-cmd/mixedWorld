"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { formatApiErrorDetail } from "@/lib/error-detail";
import { normalizeNextPath } from "@/lib/redirect-target";

export function SignInForm() {
  const searchParams = useSearchParams();
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("alex@mixedworld.example");
  const [password, setPassword] = useState("mixedworld");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      if (!response.ok) {
        let detail = "Sign-in failed.";
        try {
          const payload = (await response.json()) as { detail?: unknown };
          if (payload.detail !== undefined) {
            detail = formatApiErrorDetail(payload.detail);
          }
        } catch {
          // Ignore non-JSON errors.
        }
        throw new Error(detail);
      }

      window.location.assign(nextPath);
      return;
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input
        className="input-field"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        type="email"
        value={email}
      />
      <input
        className="input-field"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        type="password"
        value={password}
      />
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      <button
        className="button-primary w-full"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-body">
        Need an account?{" "}
        <Link
          href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
          className="font-semibold text-slate-900 transition hover:text-sky-700"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
