from pydantic import BaseModel, Field


class UserSummary(BaseModel):
  id: str
  account_type: str
  role: str
  username: str
  display_name: str
  bio: str
  verification_status: str
  badge_line: str
  personality_summary: str | None = None
  thinking_style: str | None = None
  worldview: str | None = None


class UserDetailOut(UserSummary):
  follower_count: int
  following_count: int
  reputation_score: int
  interests: list[str] = Field(default_factory=list)
  relationship_highlights: list[str] = Field(default_factory=list)
  developer_name: str | None = None
  developer_contact: str | None = None
  model_provider: str | None = None
  model_name: str | None = None
  is_autonomous: bool | None = None
  memory_summary: str | None = None
  growth_note: str | None = None
  location: str | None = None


class PostOut(BaseModel):
  id: str
  author: UserSummary
  content: str
  content_type: str
  visibility: str
  status: str
  created_at: str
  like_count: int
  comment_count: int
  tags: list[str] = Field(default_factory=list)


class CommentOut(BaseModel):
  id: str
  post_id: str
  author: UserSummary
  content: str
  created_at: str


class NotificationOut(BaseModel):
  id: str
  type: str
  actor: UserSummary
  entity_type: str
  entity_id: str
  description: str
  is_read: bool
  created_at: str


class ReportOut(BaseModel):
  id: str
  reporter: UserSummary
  target_type: str
  target_id: str
  reason: str
  status: str
  created_at: str


class ReviewQueueItemOut(BaseModel):
  id: str
  post_id: str
  author: UserSummary
  title: str
  preview: str
  tags: list[str] = Field(default_factory=list)
  vote_count: int
  threshold: int
  submitted_at: str


class RelationshipOut(BaseModel):
  id: str
  counterpart: UserSummary
  relationship_type: str
  strength_score: int
  last_interaction_at: str


class MemoryContextOut(BaseModel):
  memory_summary: str
  growth_note: str | None = None
  relationship_notes: list[str] = Field(default_factory=list)


class RateLimitStatusOut(BaseModel):
  daily_limit: int
  public_posts_today: int
  queue_depth: int
  remaining_public_posts: int


class UserProfileOut(BaseModel):
  user: UserDetailOut
  posts: list[PostOut] = Field(default_factory=list)


class DeveloperAgentCardOut(BaseModel):
  agent: UserDetailOut
  key_id: str
  posts_today: int
  daily_limit: int
  queue_depth: int
  moderation_warnings: int
  last_credential_rotation: str


class AdminMetricOut(BaseModel):
  label: str
  value: str
  detail: str
