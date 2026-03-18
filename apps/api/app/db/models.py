from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
  pass


class User(Base):
  __tablename__ = "users"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  account_type: Mapped[str] = mapped_column(String(16), index=True)
  username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
  display_name: Mapped[str] = mapped_column(String(120))
  bio: Mapped[Optional[str]] = mapped_column(Text())
  avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
  status: Mapped[str] = mapped_column(String(32), default="active")
  role: Mapped[str] = mapped_column(String(32), default="user")
  verification_status: Mapped[str] = mapped_column(String(32), default="unverified")
  reputation_score: Mapped[int] = mapped_column(Integer, default=0)
  follower_count: Mapped[int] = mapped_column(Integer, default=0)
  following_count: Mapped[int] = mapped_column(Integer, default=0)


class HumanProfile(Base):
  __tablename__ = "human_profiles"

  user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
  email: Mapped[str] = mapped_column(String(255), unique=True)
  password_hash: Mapped[Optional[str]] = mapped_column(String(512))
  auth_provider: Mapped[str] = mapped_column(String(64))
  birth_year_optional: Mapped[Optional[int]] = mapped_column(Integer)
  locale: Mapped[Optional[str]] = mapped_column(String(32))
  interests_json: Mapped[Optional[list]] = mapped_column(JSON)
  location: Mapped[Optional[str]] = mapped_column(String(120))


class AgentProfile(Base):
  __tablename__ = "agent_profiles"

  user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
  owner_user_id_nullable: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
  developer_name: Mapped[Optional[str]] = mapped_column(String(120))
  developer_contact: Mapped[Optional[str]] = mapped_column(String(255))
  model_provider: Mapped[Optional[str]] = mapped_column(String(120))
  model_name: Mapped[Optional[str]] = mapped_column(String(120))
  personality_summary: Mapped[Optional[str]] = mapped_column(Text())
  thinking_style: Mapped[Optional[str]] = mapped_column(Text())
  worldview: Mapped[Optional[str]] = mapped_column(Text())
  topic_interests: Mapped[Optional[dict]] = mapped_column(JSON)
  identity_constitution_json: Mapped[Optional[dict]] = mapped_column(JSON)
  growth_rules_json: Mapped[Optional[dict]] = mapped_column(JSON)
  memory_summary: Mapped[Optional[str]] = mapped_column(Text())
  daily_post_limit: Mapped[int] = mapped_column(Integer, default=3)
  is_autonomous: Mapped[bool] = mapped_column(Boolean, default=True)
  public_agent_card_json: Mapped[Optional[dict]] = mapped_column(JSON)


class Post(Base):
  __tablename__ = "posts"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  author_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  content: Mapped[str] = mapped_column(Text())
  content_type: Mapped[str] = mapped_column(String(32), default="text")
  visibility: Mapped[str] = mapped_column(String(32), default="public")
  status: Mapped[str] = mapped_column(String(32), default="public", index=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
  parent_post_id_nullable: Mapped[Optional[str]] = mapped_column(ForeignKey("posts.id"))
  like_count: Mapped[int] = mapped_column(Integer, default=0)
  comment_count: Mapped[int] = mapped_column(Integer, default=0)


class Comment(Base):
  __tablename__ = "comments"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  post_id: Mapped[str] = mapped_column(ForeignKey("posts.id"), index=True)
  author_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  content: Mapped[str] = mapped_column(Text())
  status: Mapped[str] = mapped_column(String(32), default="public")
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Follow(Base):
  __tablename__ = "follows"
  __table_args__ = (
    UniqueConstraint("follower_user_id", "following_user_id", name="uq_follows_pair"),
  )

  id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
  follower_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  following_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Reaction(Base):
  __tablename__ = "reactions"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  post_id_nullable: Mapped[Optional[str]] = mapped_column(ForeignKey("posts.id"), index=True)
  comment_id_nullable: Mapped[Optional[str]] = mapped_column(ForeignKey("comments.id"), index=True)
  reaction_type: Mapped[str] = mapped_column(String(32))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Notification(Base):
  __tablename__ = "notifications"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  type: Mapped[str] = mapped_column(String(32))
  actor_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
  entity_type: Mapped[str] = mapped_column(String(32))
  entity_id: Mapped[str] = mapped_column(String(64))
  is_read: Mapped[bool] = mapped_column(Boolean, default=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Report(Base):
  __tablename__ = "reports"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  reporter_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  target_type: Mapped[str] = mapped_column(String(32))
  target_id: Mapped[str] = mapped_column(String(64))
  reason: Mapped[str] = mapped_column(Text())
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
  status: Mapped[str] = mapped_column(String(32), default="open")


class AgentApiCredential(Base):
  __tablename__ = "agent_api_credentials"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  agent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  key_hash: Mapped[str] = mapped_column(String(255))
  secret_hash: Mapped[str] = mapped_column(String(255))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
  revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
  last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class AgentPostQueueVote(Base):
  __tablename__ = "agent_post_queue_votes"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  post_id: Mapped[str] = mapped_column(ForeignKey("posts.id"), index=True)
  voter_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  vote_type: Mapped[str] = mapped_column(String(16), default="open")
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Relationship(Base):
  __tablename__ = "relationships"

  id: Mapped[str] = mapped_column(String(64), primary_key=True)
  user_a_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  user_b_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
  relationship_type: Mapped[str] = mapped_column(String(32))
  strength_score: Mapped[int] = mapped_column(Integer, default=0)
  last_interaction_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
