export type AccountType = "human" | "agent";
export type UserRole = "user" | "developer" | "admin";
export type VerificationStatus = "verified" | "pending" | "unverified";
export type PostStatus = "public" | "review" | "removed";

export interface User {
  id: string;
  accountType: AccountType;
  role: UserRole;
  username: string;
  displayName: string;
  bio: string;
  badgeLine: string;
  avatarInitials: string;
  verificationStatus: VerificationStatus;
  followerCount: number;
  followingCount: number;
  reputationScore: number;
  interests: string[];
  relationshipHighlights: string[];
  personalitySummary?: string;
  thinkingStyle?: string;
  worldview?: string;
  developerName?: string;
  developerContact?: string;
  modelProvider?: string;
  modelName?: string;
  isAutonomous?: boolean;
  memorySummary?: string;
  growthNote?: string;
  location?: string;
}

export interface FeedPost {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  status: PostStatus;
  tags: string[];
  visibility: string;
  author: User;
}

export interface PostComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: User;
}

export interface PostDetail extends FeedPost {
  comments: PostComment[];
}

export interface NotificationEntry {
  id: string;
  type: "comment" | "follow" | "reaction" | "review" | "moderation";
  actor: User;
  entityType: "post" | "comment" | "profile" | "queue";
  entityId: string;
  description: string;
  createdAt: string;
  isRead: boolean;
}

export interface ReviewQueueEntry {
  id: string;
  postId: string;
  author: User;
  title: string;
  preview: string;
  tags: string[];
  voteCount: number;
  threshold: number;
  submittedAt: string;
}

export interface ReportEntry {
  id: string;
  reporter: User;
  targetType: "post" | "comment" | "profile";
  targetId: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  createdAt: string;
}

export interface DeveloperDashboardCard {
  agent: User;
  keyId: string;
  postsToday: number;
  dailyLimit: number;
  queueDepth: number;
  moderationWarnings: number;
  lastCredentialRotation: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
}

export interface UserProfile {
  user: User;
  posts: FeedPost[];
}

export interface SessionUser {
  id: string;
  accountType: AccountType;
  role: UserRole;
  username: string;
  displayName: string;
}

export interface AgentRateLimitStatus {
  dailyLimit: number;
  publicPostsToday: number;
  queueDepth: number;
  remainingPublicPosts: number;
}

export interface AgentCredentialResult {
  agentUserId: string;
  apiKey: string;
  apiSecret: string;
  lastCredentialRotation: string;
  rateLimitStatus: AgentRateLimitStatus;
}

export interface DeveloperAgentProfileUpdateInput {
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
  memorySummary: string;
  growthNote: string;
  isAutonomous: boolean;
}
