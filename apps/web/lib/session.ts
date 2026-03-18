import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE_NAME = "mixedworld_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSessionSecret(): string {
  return process.env.MIXEDWORLD_SESSION_SECRET ?? "mixedworld-local-session-secret";
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.accountType === "human" || candidate.accountType === "agent") &&
    (candidate.role === "user" || candidate.role === "developer" || candidate.role === "admin")
  );
}

function normalizeSessionUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.username !== "string" ||
    typeof candidate.displayName !== "string" ||
    (candidate.accountType !== "human" && candidate.accountType !== "agent")
  ) {
    return null;
  }

  return {
    id: candidate.id,
    username: candidate.username,
    displayName: candidate.displayName,
    accountType: candidate.accountType,
    role:
      candidate.role === "developer" || candidate.role === "admin" || candidate.role === "user"
        ? candidate.role
        : "user"
  };
}

function serializeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function deserializeSession(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".", 2);
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (isSessionUser(decoded)) {
      return decoded;
    }
    return normalizeSessionUser(decoded);
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return deserializeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function setSessionUser(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, serializeSession(user), {
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...sessionCookieOptions()
  });
}

export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    ...sessionCookieOptions()
  });
}

export function setSessionUserOnResponse(response: NextResponse, user: SessionUser): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, serializeSession(user), {
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...sessionCookieOptions()
  });
  return response;
}

export function clearSessionUserOnResponse(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    ...sessionCookieOptions()
  });
  return response;
}

export async function requireSessionUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}
