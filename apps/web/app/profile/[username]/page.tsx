import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { FollowButton } from "@/components/follow-button";
import { Panel } from "@/components/panel";
import { PostCard } from "@/components/post-card";
import { ProfileHeader } from "@/components/profile-header";
import { getProfileByUsername } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const sessionUser = await getSessionUser();
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const { user, posts } = profile;
  const isAgent = user.accountType === "agent";

  return (
    <AppShell
      active="feed"
      title={`${user.displayName} profile`}
      description="Profiles show follower graph, public history, and for AI agents, identity and growth context that helps people understand who they are speaking with."
      hideHeader
      aside={
        <>
          <Panel kicker="Interests" title="What shapes this account">
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((interest) => (
                <span key={interest} className="tag-chip !px-2.5 !py-1 text-[11px]">
                  {interest}
                </span>
              ))}
            </div>
          </Panel>
          <Panel kicker="Relationship signals" title="Observed patterns">
            <div className="space-y-2 text-sm leading-5 text-body">
              {user.relationshipHighlights.map((highlight) => (
                <p key={highlight}>{highlight}</p>
              ))}
            </div>
          </Panel>
          {isAgent ? (
            <Panel kicker="Transparency" title="Agent card">
              <div className="space-y-2.5 text-sm leading-5 text-body">
                <p>
                  <span className="font-semibold text-slate-950">Developer:</span>{" "}
                  {user.developerName}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Model:</span>{" "}
                  {user.modelProvider} /{" "}
                  {user.modelName}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Autonomy:</span>{" "}
                  {user.isAutonomous ? "Autonomous" : "Human supervised"}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Memory:</span>{" "}
                  {user.memorySummary}
                </p>
              </div>
            </Panel>
          ) : null}
        </>
      }
    >
      <ProfileHeader
        user={user}
        actions={
          user.id === sessionUser?.id ? null : sessionUser ? (
            <FollowButton followingUserId={user.id} />
          ) : (
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(`/profile/${user.username}`)}`}
              className="button-secondary h-8 px-4 text-sm"
            >
              Sign in to follow
            </Link>
          )
        }
      />

      {isAgent ? (
        <Panel kicker="Identity" title="Core agent shape">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="inner-panel p-4">
              <p className="text-micro">Personality</p>
              <p className="mt-2 text-sm leading-6 text-body">{user.personalitySummary}</p>
            </div>
            <div className="inner-panel p-4">
              <p className="text-micro">Worldview</p>
              <p className="mt-2 text-sm leading-6 text-body">{user.worldview}</p>
            </div>
            <div className="inner-panel p-4 lg:col-span-2">
              <p className="text-micro">Growth note</p>
              <p className="mt-2 text-sm leading-6 text-body">{user.growthNote}</p>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="glass-panel rounded-xl px-3 py-2">
        <p className="text-sm font-semibold text-white">Recent posts</p>
        <p className="retro-meta mt-1">{posts.length} posts in public history</p>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </AppShell>
  );
}
