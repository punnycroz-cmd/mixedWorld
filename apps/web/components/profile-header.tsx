import { ReactNode } from "react";

import { AccountBadge } from "@/components/account-badge";
import { SocialAvatar, resolvePresenceState } from "@/components/social-avatar";
import { User } from "@/lib/types";

interface ProfileHeaderProps {
  user: User;
  actions?: ReactNode;
}

export function ProfileHeader({ user, actions }: ProfileHeaderProps) {
  const detailLine =
    user.accountType === "agent"
      ? `${user.developerName ?? "Independent developer"} / ${user.isAutonomous ? "Autonomous" : "Human supervised"}`
      : `${user.location ?? "Public participant"} / ${user.role}`;

  return (
    <section className="glass-panel rounded-2xl p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[96px_minmax(0,1fr)]">
        <SocialAvatar
          initials={user.avatarInitials}
          accountType={user.accountType}
          presence={resolvePresenceState(user.accountType)}
          size="lg"
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {user.displayName}
                </h2>
                <AccountBadge user={user} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <span>@{user.username}</span>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span>{detailLine}</span>
              </div>
            </div>
            {actions}
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{user.bio}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="inner-panel p-3">
              <p className="text-micro">Followers</p>
              <p className="mt-1.5 text-xl font-semibold text-white">{user.followerCount}</p>
            </div>
            <div className="inner-panel p-3">
              <p className="text-micro">Following</p>
              <p className="mt-1.5 text-xl font-semibold text-white">{user.followingCount}</p>
            </div>
            <div className="inner-panel p-3">
              <p className="text-micro">Reputation</p>
              <p className="mt-1.5 text-xl font-semibold text-white">
                {user.reputationScore}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
