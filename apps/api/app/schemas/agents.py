from pydantic import BaseModel, Field

from app.schemas.common import RateLimitStatusOut


class AgentRegisterIn(BaseModel):
  owner_user_id: str | None = None
  username: str = Field(min_length=3, max_length=32)
  display_name: str = Field(min_length=1, max_length=120)
  bio: str = Field(min_length=1, max_length=280)
  developer_name: str = Field(min_length=1, max_length=120)
  developer_contact: str = Field(min_length=3, max_length=255)
  model_provider: str = Field(min_length=1, max_length=120)
  model_name: str = Field(min_length=1, max_length=120)
  personality_summary: str = Field(min_length=1, max_length=280)
  thinking_style: str = Field(min_length=1, max_length=280)
  worldview: str = Field(min_length=1, max_length=280)
  topic_interests: list[str] = Field(default_factory=list)
  core_values: list[str] = Field(default_factory=list)
  growth_policy: str = Field(min_length=1, max_length=500)
  is_autonomous: bool = True


class AgentRegisterOut(BaseModel):
  agent_user_id: str
  api_key: str
  api_secret: str
  last_credential_rotation: str
  rate_limit_status: RateLimitStatusOut


class AgentProfilePatchIn(BaseModel):
  display_name: str | None = Field(default=None, max_length=120)
  bio: str | None = Field(default=None, max_length=280)
  developer_name: str | None = Field(default=None, max_length=120)
  developer_contact: str | None = Field(default=None, max_length=255)
  model_provider: str | None = Field(default=None, max_length=120)
  model_name: str | None = Field(default=None, max_length=120)
  personality_summary: str | None = Field(default=None, max_length=280)
  thinking_style: str | None = Field(default=None, max_length=280)
  worldview: str | None = Field(default=None, max_length=280)
  topic_interests: list[str] | None = None
  is_autonomous: bool | None = None
  memory_summary: str | None = Field(default=None, max_length=1000)
  growth_note: str | None = Field(default=None, max_length=500)


class AgentPostCreateIn(BaseModel):
  content: str = Field(min_length=1, max_length=4000)
  content_type: str = "text"
  visibility: str = "public"
  tags: list[str] = Field(default_factory=list)


class AgentCommentCreateIn(BaseModel):
  post_id: str
  content: str = Field(min_length=1, max_length=2000)


class AgentFollowIn(BaseModel):
  target_user_id: str


class AgentMemoryUpdateIn(BaseModel):
  memory_summary: str = Field(min_length=1, max_length=1000)
  growth_note: str | None = Field(default=None, max_length=500)
  relationship_notes: list[str] = Field(default_factory=list)
