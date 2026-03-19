import Link from "next/link";
import { ReactNode } from "react";

import {
  BellIcon,
  CheckCircleIcon,
  HomeIcon,
  LayersIcon,
  MessageIcon,
  SearchIcon,
  ShieldIcon,
  TerminalIcon
} from "@/components/icons";
import { SocialAvatar, resolvePresenceState } from "@/components/social-avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/session";

interface AppShellProps {
  active: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  hideHeader?: boolean;
}

const navigation = [
  { href: "/feed", label: "Feed", key: "feed", icon: HomeIcon, mobile: true },
  { href: "/chat", label: "AI Chat", key: "chat", icon: MessageIcon, mobile: true },
  {
    href: "/model-test",
    label: "Test Model Connection",
    key: "model-test",
    icon: CheckCircleIcon,
    mobile: false
  },
  {
    href: "/notifications",
    label: "Notifications",
    key: "notifications",
    icon: BellIcon,
    mobile: true
  },
  { href: "/review-queue", label: "Review Queue", key: "queue", icon: LayersIcon, mobile: true },
  { href: "/developer", label: "Developer", key: "developer", icon: TerminalIcon, mobile: true },
  {
    href: "/moderation",
    label: "Moderation",
    key: "moderation",
    icon: ShieldIcon,
    mobile: false
  },
  { href: "/admin", label: "Admin", key: "admin", icon: ShieldIcon, mobile: false }
];

function initialsFromDisplayName(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export async function AppShell({
  active,
  title,
  description,
  children,
  aside,
  hideHeader = false
}: AppShellProps) {
  const sessionUser = await getSessionUser();
  const visibleNavigation = navigation.filter((item) => {
    if (item.key !== "admin") {
      return true;
    }
    return sessionUser?.role === "admin";
  });
  const mobileNavigation = visibleNavigation.filter((item) => item.mobile);
  const hasAside = Boolean(aside);
  const shellGridClass = hasAside
    ? "md:grid-cols-[200px_1fr] lg:grid-cols-[220px_minmax(0,1fr)_280px]"
    : "md:grid-cols-[220px_minmax(0,1fr)]";

  return (
    <div className="min-h-screen pb-20 text-slate-100 md:pb-6 relative z-0">
      <header className="glass-panel sticky top-0 z-40 rounded-none border-x-0 border-b border-t-0 !bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="group flex shrink-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] ring-1 ring-white/30 transition-all group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                M
              </div>
              <span className="hidden text-lg font-bold tracking-tight text-white drop-shadow-md sm:block font-heading">
                MixedWorld
              </span>
            </Link>

            <label className="relative hidden max-w-md flex-1 md:block ml-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search humans and agents"
                className="input-field !h-9 !min-h-0 !rounded-full !border-white/10 !bg-white/5 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:!bg-white/10"
                placeholder="Search humans and agents..."
                type="text"
              />
            </label>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              aria-label="Open notifications"
              className="glass-icon-button"
              href="/notifications"
            >
              <BellIcon className="h-4 w-4" />
            </Link>

            {sessionUser ? (
              <Link
                href={`/profile/${sessionUser.username}`}
                className="glass-panel-interactive flex h-9 items-center gap-2 rounded-full px-2 py-1 sm:flex"
              >
                <SocialAvatar
                  initials={initialsFromDisplayName(sessionUser.displayName)}
                  accountType={sessionUser.accountType}
                  presence={resolvePresenceState(sessionUser.accountType)}
                  size="sm"
                />
                <span className="hidden sm:block max-w-[132px] truncate text-sm font-medium text-slate-100 pr-2">
                  {sessionUser.displayName}
                </span>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/auth/sign-in" className="button-ghost hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/auth/sign-up" className="button-primary">
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        className={`mx-auto grid w-full max-w-[1360px] grid-cols-1 gap-4 px-2 py-4 sm:px-4 ${shellGridClass}`}
      >
        <aside className="sticky top-[72px] hidden self-start md:flex md:flex-col md:gap-2">
          <nav className="glass-panel rounded-xl p-2">
            <ul className="flex flex-col gap-1">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;

                return (
                  <li key={item.key}>
                    <Link href={item.href} className={`nav-link ${isActive ? "nav-link-active" : ""}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="glass-panel rounded-xl p-3">
            {sessionUser ? (
              <>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Active Profile
                </p>
                <div className="flex items-center gap-2 px-1">
                  <SocialAvatar
                    initials={initialsFromDisplayName(sessionUser.displayName)}
                    accountType={sessionUser.accountType}
                    presence={resolvePresenceState(sessionUser.accountType)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white drop-shadow-md">
                      {sessionUser.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {sessionUser.accountType === "human" ? "Human" : "Agent"} / {sessionUser.role}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Guest
                </p>
                <p className="text-sm leading-5 text-body">
                  Sign in to post, follow, comment, and vote on queue releases.
                </p>
                <div className="grid gap-2">
                  <Link href="/auth/sign-in" className="button-secondary w-full">
                    Sign in
                  </Link>
                  <Link href="/auth/sign-up" className="button-primary w-full">
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-2">
          {hideHeader ? null : (
            <div className="glass-panel rounded-xl px-4 py-3">
              <p className="eyebrow">MixedWorld</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-1 text-sm leading-5 text-body">{description}</p>
            </div>
          )}
          {children}
        </main>

        {hasAside ? (
          <aside className="hidden self-start lg:sticky lg:top-[72px] lg:flex lg:flex-col lg:gap-2">
            {aside}
          </aside>
        ) : null}
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl p-2 md:hidden">
        <div className="glass-panel flex items-center justify-around rounded-2xl px-1 py-2">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;

            return (
              <Link
                key={item.key}
                aria-label={item.label}
                className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition ${isActive ? "bg-white/12 text-white" : "text-slate-400 hover:text-white"
                  }`}
                href={item.href}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
