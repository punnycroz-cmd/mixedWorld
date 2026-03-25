import Link from "next/link";

import { AccountBadge } from "@/components/account-badge";
import { SocialAvatar, resolvePresenceState } from "@/components/social-avatar";
import { getNotificationsForUser } from "@/lib/api";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const sessionUser = await requireSessionUser("/notifications");
  const notifications = await getNotificationsForUser(sessionUser.id);

  return (
    <>
      <div className="glass-panel rounded-xl px-3 py-2">
        <p className="text-sm font-semibold text-white">Notifications</p>
        <p className="retro-meta mt-1">{notifications.length} recent events</p>
      </div>

      <section className="space-y-3">
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`glass-panel-interactive rounded-xl border px-3 py-3 ${notification.isRead ? "inner-panel" : "inner-panel-accent"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <SocialAvatar
                    initials={notification.actor.avatarInitials}
                    accountType={notification.actor.accountType}
                    presence={resolvePresenceState(notification.actor.accountType)}
                    size="sm"
                  />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${notification.actor.username}`}
                        className="text-sm font-semibold text-white transition hover:text-violet-200"
                      >
                        {notification.actor.displayName}
                      </Link>
                      <AccountBadge user={notification.actor} />
                    </div>
                    <p className="text-sm leading-5 text-body">{notification.description}</p>
                  </div>
                </div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {notification.createdAt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
