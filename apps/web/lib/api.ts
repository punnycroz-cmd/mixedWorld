import {
  AdminMetric,
  AgentCredentialResult,
  DeveloperDashboardCard,
  DeveloperAgentProfileUpdateInput,
  FeedPost,
  NotificationEntry,
  PostComment,
  PostDetail,
  ReportEntry,
  ReviewQueueEntry,
  User,
  UserProfile
} from "@/lib/types";
import { formatApiErrorDetail } from "@/lib/error-detail";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

const apiRoot = `${apiBaseUrl}/api/v1`;

interface ApiUserSummary {
  id: string;
  account_type: "human" | "agent";
  role: "user" | "developer" | "admin";
  username: string;
  display_name: string;
  bio: string;
  verification_status: "verified" | "pending" | "unverified";
  badge_line: string;
  personality_summary?: string | null;
  thinking_style?: string | null;
  worldview?: string | null;
}

interface ApiUserDetail extends ApiUserSummary {
  follower_count: number;
  following_count: number;
  reputation_score: number;
  interests: string[];
  relationship_highlights: string[];
  developer_name?: string | null;
  developer_contact?: string | null;
  model_provider?: string | null;
  model_name?: string | null;
  is_autonomous?: boolean | null;
  memory_summary?: string | null;
  growth_note?: string | null;
  location?: string | null;
}

interface ApiPost {
  id: string;
  author: ApiUserSummary;
  content: string;
  content_type: string;
  visibility: string;
  status: "public" | "review" | "removed";
  created_at: string;
  like_count: number;
  comment_count: number;
  tags: string[];
}

interface ApiComment {
  id: string;
  post_id: string;
  author: ApiUserSummary;
  content: string;
  created_at: string;
}

interface ApiUserProfile {
  user: ApiUserDetail;
  posts: ApiPost[];
}

interface ApiNotification {
  id: string;
  type: "comment" | "follow" | "reaction" | "review" | "moderation";
  actor: ApiUserSummary;
  entity_type: "post" | "comment" | "profile" | "queue";
  entity_id: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

interface ApiReviewQueueItem {
  id: string;
  post_id: string;
  author: ApiUserSummary;
  title: string;
  preview: string;
  tags: string[];
  vote_count: number;
  threshold: number;
  submitted_at: string;
}

interface ApiReport {
  id: string;
  reporter: ApiUserSummary;
  target_type: "post" | "comment" | "profile";
  target_id: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  created_at: string;
}

interface ApiDeveloperCard {
  agent: ApiUserDetail;
  key_id: string;
  posts_today: number;
  daily_limit: number;
  queue_depth: number;
  moderation_warnings: number;
  last_credential_rotation: string;
}

interface ApiAdminMetric {
  label: string;
  value: string;
  detail: string;
}

interface ApiRateLimitStatus {
  daily_limit: number;
  public_posts_today: number;
  queue_depth: number;
  remaining_public_posts: number;
}

interface ApiAgentCredentialResult {
  agent_user_id: string;
  api_key: string;
  api_secret: string;
  last_credential_rotation: string;
  rate_limit_status: ApiRateLimitStatus;
}

interface ApiError {
  detail?: unknown;
}

function initialsFromDisplayName(displayName: string): string {
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function relativeTimeFromIso(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  const diffSeconds = Math.round((timestamp.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  if (absoluteSeconds < 60) {
    return `${absoluteSeconds}s ago`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return `${Math.abs(diffDays)}d ago`;
  }

  return timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function toUser(source: ApiUserSummary | ApiUserDetail): User {
  const detail = source as Partial<ApiUserDetail>;
  return {
    id: source.id,
    accountType: source.account_type,
    role: source.role,
    username: source.username,
    displayName: source.display_name,
    bio: source.bio,
    badgeLine: source.badge_line,
    avatarInitials: initialsFromDisplayName(source.display_name),
    verificationStatus: source.verification_status,
    followerCount: detail.follower_count ?? 0,
    followingCount: detail.following_count ?? 0,
    reputationScore: detail.reputation_score ?? 0,
    interests: detail.interests ?? [],
    relationshipHighlights: detail.relationship_highlights ?? [],
    personalitySummary: source.personality_summary ?? undefined,
    thinkingStyle: source.thinking_style ?? undefined,
    worldview: source.worldview ?? undefined,
    developerName: detail.developer_name ?? undefined,
    developerContact: detail.developer_contact ?? undefined,
    modelProvider: detail.model_provider ?? undefined,
    modelName: detail.model_name ?? undefined,
    isAutonomous: detail.is_autonomous ?? undefined,
    memorySummary: detail.memory_summary ?? undefined,
    growthNote: detail.growth_note ?? undefined,
    location: detail.location ?? undefined
  };
}

function toFeedPost(post: ApiPost): FeedPost {
  return {
    id: post.id,
    author: toUser(post.author),
    content: post.content,
    createdAt: relativeTimeFromIso(post.created_at),
    likeCount: post.like_count,
    commentCount: post.comment_count,
    status: post.status,
    tags: post.tags ?? [],
    visibility: post.visibility
  };
}

function toComment(comment: ApiComment): PostComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    author: toUser(comment.author),
    content: comment.content,
    createdAt: relativeTimeFromIso(comment.created_at)
  };
}

function toAgentCredentialResult(result: ApiAgentCredentialResult): AgentCredentialResult {
  return {
    agentUserId: result.agent_user_id,
    apiKey: result.api_key,
    apiSecret: result.api_secret,
    lastCredentialRotation: relativeTimeFromIso(result.last_credential_rotation),
    rateLimitStatus: {
      dailyLimit: result.rate_limit_status.daily_limit,
      publicPostsToday: result.rate_limit_status.public_posts_today,
      queueDepth: result.rate_limit_status.queue_depth,
      remainingPublicPosts: result.rate_limit_status.remaining_public_posts
    }
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiRoot}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      cache: init?.method ? init.cache : "no-store",
      signal: init?.signal ?? AbortSignal.timeout(6000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(`Backend API timed out at ${apiBaseUrl}.`);
    }

    throw new Error(`Could not reach backend API at ${apiBaseUrl}.`);
  }

  if (!response.ok) {
    let detail = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as ApiError;
      if (payload.detail !== undefined) {
        detail = formatApiErrorDetail(payload.detail);
      }
    } catch {
      // Ignore non-JSON failures.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function appFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let detail = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as ApiError;
      if (payload.detail !== undefined) {
        detail = formatApiErrorDetail(payload.detail);
      }
    } catch {
      // Ignore non-JSON failures.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getFeedPosts(): Promise<FeedPost[]> {
  const posts = await apiFetch<ApiPost[]>("/feed");
  return posts.map(toFeedPost);
}

export async function getFeaturedAgents(): Promise<User[]> {
  const agents = await apiFetch<ApiUserDetail[]>("/users?account_type=agent");
  return agents.map(toUser);
}

export async function getPostWithComments(postId: string): Promise<PostDetail | null> {
  try {
    const [post, comments] = await Promise.all([
      apiFetch<ApiPost>(`/posts/${postId}`),
      apiFetch<ApiComment[]>(`/posts/${postId}/comments`)
    ]);

    return {
      ...toFeedPost(post),
      comments: comments.map(toComment)
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Post not found.") {
      return null;
    }
    throw error;
  }
}

export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const profile = await apiFetch<ApiUserProfile>(`/users/${username}`);
    return {
      user: toUser(profile.user),
      posts: profile.posts.map(toFeedPost)
    };
  } catch (error) {
    if (error instanceof Error && error.message === "User not found.") {
      return null;
    }
    throw error;
  }
}

export async function getNotificationsForUser(userId: string): Promise<NotificationEntry[]> {
  const notifications = await apiFetch<ApiNotification[]>(
    `/notifications?user_id=${encodeURIComponent(userId)}`
  );
  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    actor: toUser(notification.actor),
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    description: notification.description,
    createdAt: relativeTimeFromIso(notification.created_at),
    isRead: notification.is_read
  }));
}

export async function getReviewQueue(): Promise<ReviewQueueEntry[]> {
  const queue = await apiFetch<ApiReviewQueueItem[]>("/review-queue");
  return queue.map((item) => ({
    id: item.id,
    postId: item.post_id,
    author: toUser(item.author),
    title: item.title,
    preview: item.preview,
    tags: item.tags ?? [],
    voteCount: item.vote_count,
    threshold: item.threshold,
    submittedAt: relativeTimeFromIso(item.submitted_at)
  }));
}

export async function getDeveloperDashboard(ownerUserId: string): Promise<DeveloperDashboardCard[]> {
  const cards = await apiFetch<ApiDeveloperCard[]>(
    `/developer/dashboard?owner_user_id=${encodeURIComponent(ownerUserId)}`
  );
  return cards.map((card) => ({
    agent: toUser(card.agent),
    keyId: card.key_id,
    postsToday: card.posts_today,
    dailyLimit: card.daily_limit,
    queueDepth: card.queue_depth,
    moderationWarnings: card.moderation_warnings,
    lastCredentialRotation: relativeTimeFromIso(card.last_credential_rotation)
  }));
}

export async function getReports(): Promise<ReportEntry[]> {
  const reports = await apiFetch<ApiReport[]>("/reports");
  return reports.map((report) => ({
    id: report.id,
    reporter: toUser(report.reporter),
    targetType: report.target_type,
    targetId: report.target_id,
    reason: report.reason,
    status: report.status,
    createdAt: relativeTimeFromIso(report.created_at)
  }));
}

export async function getAdminMetrics(): Promise<AdminMetric[]> {
  const metrics = await apiFetch<ApiAdminMetric[]>("/admin/metrics");
  return metrics.map((metric) => ({
    label: metric.label,
    value: metric.value,
    detail: metric.detail
  }));
}

export async function createPost(content: string): Promise<FeedPost> {
  const post = await appFetch<ApiPost>("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      content
    })
  });
  return toFeedPost(post);
}

export async function createComment(postId: string, content: string): Promise<PostComment> {
  const comment = await appFetch<ApiComment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content
    })
  });
  return toComment(comment);
}

export async function followUser(followingUserId: string): Promise<{ created: boolean }> {
  const response = await appFetch<{ created?: boolean }>("/api/follows", {
    method: "POST",
    body: JSON.stringify({
      followingUserId
    })
  });
  return {
    created: response.created ?? true
  };
}

export async function voteReviewQueue(postId: string): Promise<void> {
  await appFetch(`/api/review-queue/${postId}/votes`, {
    method: "POST"
  });
}

export async function createDeveloperAgent(payload: {
  username: string;
  displayName: string;
  bio: string;
  developerName: string;
  developerContact: string;
  modelProvider: string;
  modelName: string;
  personalitySummary: string;
  thinkingStyle: string;
  worldview: string;
  topicInterests: string[];
  coreValues: string[];
  growthPolicy: string;
  isAutonomous: boolean;
}): Promise<AgentCredentialResult> {
  const result = await appFetch<ApiAgentCredentialResult>("/api/developer/agents", {
    method: "POST",
    body: JSON.stringify({
      username: payload.username,
      display_name: payload.displayName,
      bio: payload.bio,
      developer_name: payload.developerName,
      developer_contact: payload.developerContact,
      model_provider: payload.modelProvider,
      model_name: payload.modelName,
      personality_summary: payload.personalitySummary,
      thinking_style: payload.thinkingStyle,
      worldview: payload.worldview,
      topic_interests: payload.topicInterests,
      core_values: payload.coreValues,
      growth_policy: payload.growthPolicy,
      is_autonomous: payload.isAutonomous
    })
  });
  return toAgentCredentialResult(result);
}

export async function rotateDeveloperAgentCredentials(
  agentUserId: string
): Promise<AgentCredentialResult> {
  const result = await appFetch<ApiAgentCredentialResult>(
    `/api/developer/agents/${agentUserId}/credentials/rotate`,
    {
      method: "POST"
    }
  );
  return toAgentCredentialResult(result);
}

export async function updateDeveloperAgentProfile(
  agentUserId: string,
  payload: DeveloperAgentProfileUpdateInput
): Promise<User> {
  const user = await appFetch<ApiUserDetail>(`/api/developer/agents/${agentUserId}`, {
    method: "PATCH",
    body: JSON.stringify({
      display_name: payload.displayName,
      bio: payload.bio,
      developer_name: payload.developerName,
      developer_contact: payload.developerContact,
      model_provider: payload.modelProvider,
      model_name: payload.modelName,
      personality_summary: payload.personalitySummary,
      thinking_style: payload.thinkingStyle,
      worldview: payload.worldview,
      topic_interests: payload.topicInterests,
      memory_summary: payload.memorySummary,
      growth_note: payload.growthNote,
      is_autonomous: payload.isAutonomous
    })
  });
  return toUser(user);
}
