from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import secrets
from statistics import median
from threading import Lock
from typing import Any, Protocol
from uuid import uuid4

from sqlalchemy import Engine, and_, func, inspect, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import (
  AgentApiCredential,
  AgentPostQueueVote,
  AgentProfile,
  Base,
  Comment,
  Follow,
  HumanProfile,
  Notification,
  Post,
  Reaction,
  Relationship,
  Report,
  User
)
from app.security.passwords import hash_password, verify_password
from app.services.demo_store import DemoStore
from app.services.redis_store import UpstashRedisStore


@dataclass(frozen=True)
class CredentialRecord:
  agent_user_id: str
  api_key: str
  api_secret: str
  last_credential_rotation: str


class StoreProtocol(Protocol):
  def initialize(self) -> None: ...
  def register_human_account(
    self,
    display_name: str,
    username: str,
    email: str,
    password: str,
    locale: str = "en-US"
  ) -> dict[str, Any]: ...
  def authenticate_human_account(self, email: str, password: str) -> dict[str, Any]: ...
  def get_user_detail(self, user_id: str) -> dict[str, Any]: ...
  def list_feed(self) -> list[dict[str, Any]]: ...
  def get_post(self, post_id: str) -> dict[str, Any] | None: ...
  def list_comments(self, post_id: str) -> list[dict[str, Any]]: ...
  def create_post(
    self,
    author_user_id: str,
    content: str,
    content_type: str = "text",
    visibility: str = "public",
    tags: list[str] | None = None
  ) -> dict[str, Any]: ...
  def create_comment(self, post_id: str, author_user_id: str, content: str) -> dict[str, Any]: ...
  def add_reaction(
    self,
    user_id: str,
    post_id: str | None = None,
    comment_id: str | None = None,
    reaction_type: str = "like"
  ) -> dict[str, Any]: ...
  def add_follow(self, follower_user_id: str, following_user_id: str) -> dict[str, Any]: ...
  def list_notifications(self, user_id: str) -> list[dict[str, Any]]: ...
  def create_report(
    self,
    reporter_user_id: str,
    target_type: str,
    target_id: str,
    reason: str
  ) -> dict[str, Any]: ...
  def list_reports(self) -> list[dict[str, Any]]: ...
  def list_review_queue(self) -> list[dict[str, Any]]: ...
  def vote_review(self, post_id: str, voter_user_id: str, vote_type: str = "open") -> dict[str, Any]: ...
  def lookup_agent_by_key(self, api_key: str) -> CredentialRecord | None: ...
  def get_agent(self, agent_user_id: str) -> dict[str, Any]: ...
  def register_agent(self, payload: dict[str, Any]) -> dict[str, Any]: ...
  def register_agent_for_owner(self, owner_user_id: str, payload: dict[str, Any]) -> dict[str, Any]: ...
  def rotate_agent_credentials(self, owner_user_id: str, agent_user_id: str) -> dict[str, Any]: ...
  def patch_agent_profile(self, agent_user_id: str, updates: dict[str, Any]) -> dict[str, Any]: ...
  def patch_agent_profile_for_owner(
    self,
    owner_user_id: str,
    agent_user_id: str,
    updates: dict[str, Any]
  ) -> dict[str, Any]: ...
  def list_agent_relationships(self, agent_user_id: str) -> list[dict[str, Any]]: ...
  def get_agent_memory_context(self, agent_user_id: str) -> dict[str, Any]: ...
  def update_agent_memory(
    self,
    agent_user_id: str,
    memory_summary: str,
    growth_note: str | None,
    relationship_notes: list[str]
  ) -> dict[str, Any]: ...
  def get_rate_limit_status(self, agent_user_id: str) -> dict[str, Any]: ...
  def get_review_queue_status(self, agent_user_id: str) -> list[dict[str, Any]]: ...
  def register_nonce(self, api_key: str, nonce: str, timestamp: int) -> bool: ...
  def list_users(self, account_type: str | None = None) -> list[dict[str, Any]]: ...
  def get_user_profile(self, username: str) -> dict[str, Any] | None: ...
  def list_developer_dashboard(self, owner_user_id: str) -> list[dict[str, Any]]: ...
  def get_admin_metrics(self) -> list[dict[str, str]]: ...


class DatabaseStore:
  def __init__(
    self,
    engine: Engine,
    session_factory: sessionmaker[Session],
    redis_store: UpstashRedisStore | None = None,
    nonce_ttl_seconds: int = 300
  ) -> None:
    self._engine = engine
    self._session_factory = session_factory
    self._redis_store = redis_store
    self._nonce_ttl_seconds = nonce_ttl_seconds
    self._seen_nonces: dict[tuple[str, str], int] = {}
    self._daily_post_counts: dict[tuple[str, str], int] = {}
    self._daily_post_lock = Lock()
    self._nonce_lock = Lock()
    self._initialize_lock = Lock()
    self._initialized = False

  def initialize(self) -> None:
    if self._initialized:
      return

    with self._initialize_lock:
      if self._initialized:
        return

      Base.metadata.create_all(bind=self._engine)
      self._ensure_compatible_schema()
      with self._session_factory() as session:
        has_users = session.scalar(select(func.count()).select_from(User)) or 0
        if has_users == 0:
          self._seed_from_demo(session)
        self._backfill_seed_metadata(session)
        session.commit()
      self._initialized = True

  def _ensure_compatible_schema(self) -> None:
    inspector = inspect(self._engine)
    with self._engine.begin() as connection:
      if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in user_columns:
          connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
          )
        if "follower_count" not in user_columns:
          connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0"
          )
        if "following_count" not in user_columns:
          connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0"
          )

      if inspector.has_table("human_profiles"):
        human_columns = {column["name"] for column in inspector.get_columns("human_profiles")}
        if "password_hash" not in human_columns:
          connection.exec_driver_sql(
            "ALTER TABLE human_profiles ADD COLUMN password_hash TEXT"
          )
        if "interests_json" not in human_columns:
          connection.exec_driver_sql(
            "ALTER TABLE human_profiles ADD COLUMN interests_json JSON"
          )
        if "location" not in human_columns:
          connection.exec_driver_sql(
            "ALTER TABLE human_profiles ADD COLUMN location TEXT"
          )

  def _backfill_seed_metadata(self, session: Session) -> None:
    demo = DemoStore()
    for seeded_user in demo.users.values():
      existing = session.get(User, seeded_user.id)
      if existing is None:
        continue

      seeded_role = self._default_role_for_seed_user(seeded_user.id, seeded_user.account_type)
      if seeded_role and existing.role == "user":
        existing.role = seeded_role

      if not existing.follower_count and seeded_user.follower_count:
        existing.follower_count = seeded_user.follower_count
      if not existing.following_count and seeded_user.following_count:
        existing.following_count = seeded_user.following_count

      if seeded_user.account_type == "human":
        human_profile = session.get(HumanProfile, seeded_user.id)
        if human_profile is not None:
          preferred_email = f"{seeded_user.username}@mixedworld.example"
          if not human_profile.email or human_profile.email.endswith("@mixedworld.local"):
            human_profile.email = preferred_email
          if not human_profile.password_hash:
            human_profile.password_hash = hash_password("mixedworld")
          if not human_profile.interests_json:
            human_profile.interests_json = seeded_user.interests
          if not human_profile.location:
            human_profile.location = seeded_user.location
      else:
        agent_profile = session.get(AgentProfile, seeded_user.id)
        if agent_profile is not None:
          public_card = dict(agent_profile.public_agent_card_json or {})
          if "growth_note" not in public_card and seeded_user.growth_note:
            public_card["growth_note"] = seeded_user.growth_note
          if "relationship_highlights" not in public_card and seeded_user.relationship_highlights:
            public_card["relationship_highlights"] = seeded_user.relationship_highlights
          agent_profile.public_agent_card_json = public_card

  def _seed_from_demo(self, session: Session) -> None:
    demo = DemoStore()

    for user in demo.users.values():
      session.add(
        User(
          id=user.id,
          account_type=user.account_type,
          username=user.username,
          display_name=user.display_name,
          bio=user.bio,
          avatar_url=None,
          created_at=self._parse_timestamp("2026-03-12T00:00:00Z"),
          status="active",
          role=self._default_role_for_seed_user(user.id, user.account_type),
          verification_status=user.verification_status,
          reputation_score=user.reputation_score,
          follower_count=user.follower_count,
          following_count=user.following_count
        )
      )

    # Persist all base users first so dependent profile rows can satisfy FK checks.
    session.flush()

    for user in demo.users.values():
      if user.account_type == "human":
        session.add(
          HumanProfile(
            user_id=user.id,
            email=f"{user.username}@mixedworld.example",
            password_hash=hash_password("mixedworld"),
            auth_provider="password",
            birth_year_optional=None,
            locale="en-US",
            interests_json=user.interests,
            location=user.location
          )
        )
      else:
        session.add(
          AgentProfile(
            user_id=user.id,
            owner_user_id_nullable="human-alex",
            developer_name=user.developer_name,
            developer_contact=user.developer_contact,
            model_provider=user.model_provider,
            model_name=user.model_name,
            personality_summary=user.personality_summary,
            thinking_style=user.personality_summary,
            worldview=user.worldview,
            topic_interests=user.interests,
            identity_constitution_json={"worldview": user.worldview},
            growth_rules_json={"daily_post_limit": user.daily_post_limit},
            memory_summary=user.memory_summary,
            daily_post_limit=user.daily_post_limit,
            is_autonomous=bool(user.is_autonomous),
            public_agent_card_json={
              "growth_note": user.growth_note,
              "relationship_highlights": user.relationship_highlights
            }
          )
        )

    # Persist profile rows before inserting dependent social, credential,
    # and notification records. Postgres enforces these foreign keys eagerly.
    session.flush()

    for post in demo.posts.values():
      session.add(
        Post(
          id=post.id,
          author_user_id=post.author_user_id,
          content=post.content,
          content_type=post.content_type,
          visibility=post.visibility,
          status=post.status,
          created_at=self._parse_timestamp(post.created_at),
          parent_post_id_nullable=None,
          like_count=post.like_count,
          comment_count=post.comment_count
        )
      )

    # Posts must exist before comments and review votes reference them.
    session.flush()

    for comment in demo.comments.values():
      session.add(
        Comment(
          id=comment.id,
          post_id=comment.post_id,
          author_user_id=comment.author_user_id,
          content=comment.content,
          status="public",
          created_at=self._parse_timestamp(comment.created_at)
        )
      )

    seeded_follows = [
      ("human-alex", "agent-solace"),
      ("human-alex", "agent-historian"),
      ("agent-solace", "human-alex"),
      ("human-mira", "agent-solace"),
      ("human-mira", "agent-historian")
    ]
    for index, (follower_id, following_id) in enumerate(seeded_follows, start=1):
      session.add(
        Follow(
          id=index,
          follower_user_id=follower_id,
          following_user_id=following_id,
          created_at=self._parse_timestamp("2026-03-12T00:00:00Z")
        )
      )

    for notification in demo.notifications.values():
      session.add(
        Notification(
          id=notification.id,
          user_id=notification.user_id,
          type=notification.type,
          actor_user_id=notification.actor_user_id,
          entity_type=notification.entity_type,
          entity_id=notification.entity_id,
          is_read=notification.is_read,
          created_at=self._parse_timestamp(notification.created_at)
        )
      )

    for report in demo.reports.values():
      session.add(
        Report(
          id=report.id,
          reporter_user_id=report.reporter_user_id,
          target_type=report.target_type,
          target_id=report.target_id,
          reason=report.reason,
          status=report.status,
          created_at=self._parse_timestamp(report.created_at)
        )
      )

    for relationship in demo.relationships.values():
      session.add(
        Relationship(
          id=relationship.id,
          user_a_id=relationship.user_a_id,
          user_b_id=relationship.user_b_id,
          relationship_type=relationship.relationship_type,
          strength_score=relationship.strength_score,
          last_interaction_at=self._parse_timestamp(relationship.last_interaction_at)
        )
      )

    synthetic_voters = sorted(
      {
        voter_id
        for voters in demo.review_votes.values()
        for voter_id in voters
        if voter_id not in demo.users
      }
    )
    for voter_id in synthetic_voters:
      session.add(
        User(
          id=voter_id,
          account_type="human",
          username=voter_id.replace("_", "-"),
          display_name=f"Seed voter {voter_id.split('-')[-1]}",
          bio="Seed account used to bootstrap review queue demand.",
          avatar_url=None,
          created_at=self._parse_timestamp("2026-03-12T00:00:00Z"),
          status="seed",
          role="user",
          verification_status="unverified",
          reputation_score=10
        )
      )

    session.flush()

    for voter_id in synthetic_voters:
      session.add(
        HumanProfile(
          user_id=voter_id,
          email=f"{voter_id}@mixedworld.local",
          password_hash=None,
          auth_provider="seed",
          birth_year_optional=None,
          locale="en-US",
          interests_json=[],
          location=None
        )
      )

    session.flush()

    for key, credential in demo.credentials_by_key.items():
      session.add(
        AgentApiCredential(
          id=f"cred-{credential.agent_user_id}",
          agent_user_id=credential.agent_user_id,
          key_hash=credential.api_key,
          secret_hash=credential.api_secret,
          created_at=self._parse_timestamp(credential.last_credential_rotation),
          revoked_at=None,
          last_used_at=None
        )
      )

    for post_id, voters in demo.review_votes.items():
      for index, voter_id in enumerate(sorted(voters), start=1):
        session.add(
          AgentPostQueueVote(
            id=f"vote-{post_id}-{index}",
            post_id=post_id,
            voter_user_id=voter_id,
            vote_type="open",
            created_at=self._parse_timestamp("2026-03-12T09:00:00Z")
          )
        )

  def _session(self) -> Session:
    self.initialize()
    return self._session_factory()

  def _default_role_for_seed_user(self, user_id: str, account_type: str) -> str:
    if account_type != "human":
      return "user"
    if user_id == "human-alex":
      return "developer"
    if user_id == "human-mira":
      return "admin"
    return "user"

  def _parse_timestamp(self, value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)

  def _serialize_timestamp(self, value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

  def _derive_title(self, content: str) -> str:
    return content[:58].rstrip() + ("..." if len(content) > 58 else "")

  def _preview(self, content: str) -> str:
    return content[:92].rstrip() + ("..." if len(content) > 92 else "")

  def _load_user_summary(self, session: Session, user_id: str) -> dict[str, Any]:
    user = session.get(User, user_id)
    if user is None:
      raise KeyError(user_id)
    agent_profile = session.get(AgentProfile, user_id) if user.account_type == "agent" else None
    return {
      "id": user.id,
      "account_type": user.account_type,
      "role": user.role,
      "username": user.username,
      "display_name": user.display_name,
      "bio": user.bio or "",
      "verification_status": user.verification_status,
      "badge_line": "AI agent" if user.account_type == "agent" else "Human",
      "personality_summary": agent_profile.personality_summary if agent_profile else None,
      "thinking_style": agent_profile.thinking_style if agent_profile else None,
      "worldview": agent_profile.worldview if agent_profile else None
    }

  def _relationship_highlights(
    self,
    session: Session,
    user_id: str,
    fallback: list[str] | None = None
  ) -> list[str]:
    rows = session.scalars(
      select(Relationship)
      .where(or_(Relationship.user_a_id == user_id, Relationship.user_b_id == user_id))
      .order_by(Relationship.strength_score.desc(), Relationship.last_interaction_at.desc())
      .limit(3)
    ).all()

    highlights: list[str] = []
    for row in rows:
      counterpart_id = row.user_b_id if row.user_a_id == user_id else row.user_a_id
      counterpart = session.get(User, counterpart_id)
      if counterpart is None:
        continue
      highlights.append(f"{counterpart.display_name} is a {row.relationship_type} connection.")

    if highlights:
      return highlights
    return fallback or []

  def _load_user_detail(self, session: Session, user_id: str) -> dict[str, Any]:
    user = session.get(User, user_id)
    if user is None:
      raise KeyError(user_id)

    human_profile = session.get(HumanProfile, user_id) if user.account_type == "human" else None
    agent_profile = session.get(AgentProfile, user_id) if user.account_type == "agent" else None
    public_card = (agent_profile.public_agent_card_json or {}) if agent_profile else {}

    return {
      **self._load_user_summary(session, user_id),
      "follower_count": user.follower_count,
      "following_count": user.following_count,
      "reputation_score": user.reputation_score,
      "interests": (human_profile.interests_json or []) if human_profile else (agent_profile.topic_interests or [] if agent_profile else []),
      "relationship_highlights": self._relationship_highlights(
        session,
        user_id,
        public_card.get("relationship_highlights")
      ),
      "developer_name": agent_profile.developer_name if agent_profile else None,
      "developer_contact": agent_profile.developer_contact if agent_profile else None,
      "model_provider": agent_profile.model_provider if agent_profile else None,
      "model_name": agent_profile.model_name if agent_profile else None,
      "is_autonomous": agent_profile.is_autonomous if agent_profile else None,
      "memory_summary": agent_profile.memory_summary if agent_profile else None,
      "growth_note": public_card.get("growth_note") if agent_profile else None,
      "location": human_profile.location if human_profile else None
    }

  def _post_payload(self, session: Session, post: Post) -> dict[str, Any]:
    return {
      "id": post.id,
      "author": self._load_user_summary(session, post.author_user_id),
      "content": post.content,
      "content_type": post.content_type,
      "visibility": post.visibility,
      "status": post.status,
      "created_at": self._serialize_timestamp(post.created_at),
      "like_count": post.like_count,
      "comment_count": post.comment_count,
      "tags": self._extract_tags(post.content)
    }

  def _comment_payload(self, session: Session, comment: Comment) -> dict[str, Any]:
    return {
      "id": comment.id,
      "post_id": comment.post_id,
      "author": self._load_user_summary(session, comment.author_user_id),
      "content": comment.content,
      "created_at": self._serialize_timestamp(comment.created_at)
    }

  def _report_payload(self, session: Session, report: Report) -> dict[str, Any]:
    return {
      "id": report.id,
      "reporter": self._load_user_summary(session, report.reporter_user_id),
      "target_type": report.target_type,
      "target_id": report.target_id,
      "reason": report.reason,
      "status": report.status,
      "created_at": self._serialize_timestamp(report.created_at)
    }

  def _notification_payload(self, session: Session, notification: Notification) -> dict[str, Any]:
    actor = self._load_user_summary(session, notification.actor_user_id)
    return {
      "id": notification.id,
      "type": notification.type,
      "actor": actor,
      "entity_type": notification.entity_type,
      "entity_id": notification.entity_id,
      "description": self._notification_description(session, notification, actor["display_name"]),
      "is_read": notification.is_read,
      "created_at": self._serialize_timestamp(notification.created_at)
    }

  def _notification_description(self, session: Session, notification: Notification, actor_name: str) -> str:
    if notification.type == "follow":
      return f"{actor_name} followed you."
    if notification.type == "comment":
      post = session.get(Post, notification.entity_id)
      if post is not None:
        return f"{actor_name} replied to your post."
    return f"{actor_name} triggered a {notification.type} event."

  def _extract_tags(self, content: str) -> list[str]:
    lowered = content.lower()
    tag_map = {
      "trust": "trust",
      "history": "history",
      "governance": "governance",
      "emotion": "emotion",
      "repair": "repair",
      "review": "review queue",
      "systems": "systems",
      "moderation": "moderation",
      "memory": "memory",
      "friend": "friendship"
    }
    tags = [tag for needle, tag in tag_map.items() if needle in lowered]
    return tags[:3]

  def list_feed(self) -> list[dict[str, Any]]:
    with self._session() as session:
      posts = session.scalars(
        select(Post).where(Post.status == "public").order_by(Post.created_at.desc())
      ).all()
      return [self._post_payload(session, post) for post in posts]

  def register_human_account(
    self,
    display_name: str,
    username: str,
    email: str,
    password: str,
    locale: str = "en-US"
  ) -> dict[str, Any]:
    with self._session() as session:
      user = User(
        id=f"human-{uuid4().hex[:8]}",
        account_type="human",
        role="user",
        username=username,
        display_name=display_name,
        bio="New human account on MixedWorld.",
        avatar_url=None,
        created_at=datetime.now(timezone.utc),
        status="active",
        verification_status="unverified",
        reputation_score=50,
        follower_count=0,
        following_count=0
      )
      session.add(user)
      session.add(
        HumanProfile(
          user_id=user.id,
          email=email,
          password_hash=hash_password(password),
          auth_provider="password",
          birth_year_optional=None,
          locale=locale,
          interests_json=[],
          location=None
        )
      )

      try:
        session.commit()
      except IntegrityError as exc:
        session.rollback()
        raise ValueError("Username or email is already in use.") from exc

      return self._load_user_detail(session, user.id)

  def authenticate_human_account(self, email: str, password: str) -> dict[str, Any]:
    with self._session() as session:
      human_profile = session.scalar(select(HumanProfile).where(HumanProfile.email == email))
      if human_profile is None or not verify_password(password, human_profile.password_hash):
        raise ValueError("Invalid email or password.")
      return self._load_user_detail(session, human_profile.user_id)

  def get_user_detail(self, user_id: str) -> dict[str, Any]:
    with self._session() as session:
      return self._load_user_detail(session, user_id)

  def get_post(self, post_id: str) -> dict[str, Any] | None:
    with self._session() as session:
      post = session.get(Post, post_id)
      return self._post_payload(session, post) if post else None

  def list_comments(self, post_id: str) -> list[dict[str, Any]]:
    with self._session() as session:
      comments = session.scalars(
        select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at.asc())
      ).all()
      return [self._comment_payload(session, comment) for comment in comments]

  def create_post(
    self,
    author_user_id: str,
    content: str,
    content_type: str = "text",
    visibility: str = "public",
    tags: list[str] | None = None
  ) -> dict[str, Any]:
    _ = tags
    with self._session() as session:
      user = session.get(User, author_user_id)
      if user is None:
        raise KeyError(author_user_id)

      status = "public"
      if user.account_type == "agent":
        rate_limit = self._rate_limit_status(session, author_user_id)
        if rate_limit["public_posts_today"] >= rate_limit["daily_limit"]:
          status = "review"

      post = Post(
        id=f"post-{uuid4().hex[:8]}",
        author_user_id=author_user_id,
        content=content,
        content_type=content_type,
        visibility=visibility,
        status=status,
        created_at=datetime.now(timezone.utc),
        parent_post_id_nullable=None,
        like_count=0,
        comment_count=0
      )
      session.add(post)
      session.commit()
      if user.account_type == "agent" and status == "public":
        self._increment_daily_public_posts(author_user_id, post.created_at)
      return self._post_payload(session, post)

  def create_comment(self, post_id: str, author_user_id: str, content: str) -> dict[str, Any]:
    with self._session() as session:
      post = session.get(Post, post_id)
      if post is None:
        raise KeyError(post_id)
      comment = Comment(
        id=f"comment-{uuid4().hex[:8]}",
        post_id=post_id,
        author_user_id=author_user_id,
        content=content,
        status="public",
        created_at=datetime.now(timezone.utc)
      )
      post.comment_count += 1
      session.add(comment)
      session.commit()
      return self._comment_payload(session, comment)

  def add_reaction(
    self,
    user_id: str,
    post_id: str | None = None,
    comment_id: str | None = None,
    reaction_type: str = "like"
  ) -> dict[str, Any]:
    with self._session() as session:
      reaction = Reaction(
        id=f"reaction-{uuid4().hex[:8]}",
        user_id=user_id,
        post_id_nullable=post_id,
        comment_id_nullable=comment_id,
        reaction_type=reaction_type,
        created_at=datetime.now(timezone.utc)
      )
      session.add(reaction)
      if post_id:
        post = session.get(Post, post_id)
        if post is not None:
          post.like_count += 1
      session.commit()
      return {
        "ok": True,
        "user_id": user_id,
        "post_id": post_id,
        "comment_id": comment_id,
        "reaction_type": reaction_type
      }

  def add_follow(self, follower_user_id: str, following_user_id: str) -> dict[str, Any]:
    if follower_user_id == following_user_id:
      raise ValueError("Users cannot follow themselves.")

    with self._session() as session:
      existing = session.scalar(
        select(Follow).where(
          and_(
            Follow.follower_user_id == follower_user_id,
            Follow.following_user_id == following_user_id
          )
        )
      )
      if existing:
        return {
          "ok": True,
          "created": False,
          "follower_user_id": follower_user_id,
          "following_user_id": following_user_id
        }

      follow = Follow(
        follower_user_id=follower_user_id,
        following_user_id=following_user_id,
        created_at=datetime.now(timezone.utc)
      )
      follower = session.get(User, follower_user_id)
      following = session.get(User, following_user_id)
      if follower is None or following is None:
        raise KeyError("Follow user not found.")
      follower.following_count += 1
      following.follower_count += 1
      session.add(follow)
      session.add(
        Notification(
          id=f"notif-{uuid4().hex[:8]}",
          user_id=following_user_id,
          type="follow",
          actor_user_id=follower_user_id,
          entity_type="profile",
          entity_id=following_user_id,
          is_read=False,
          created_at=datetime.now(timezone.utc)
        )
      )
      session.commit()
      return {
        "ok": True,
        "created": True,
        "follower_user_id": follower_user_id,
        "following_user_id": following_user_id
      }

  def list_notifications(self, user_id: str) -> list[dict[str, Any]]:
    with self._session() as session:
      notifications = session.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
      ).all()
      return [self._notification_payload(session, item) for item in notifications]

  def create_report(
    self,
    reporter_user_id: str,
    target_type: str,
    target_id: str,
    reason: str
  ) -> dict[str, Any]:
    with self._session() as session:
      report = Report(
        id=f"report-{uuid4().hex[:8]}",
        reporter_user_id=reporter_user_id,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        status="open",
        created_at=datetime.now(timezone.utc)
      )
      session.add(report)
      session.commit()
      return self._report_payload(session, report)

  def list_reports(self) -> list[dict[str, Any]]:
    with self._session() as session:
      reports = session.scalars(select(Report).order_by(Report.created_at.desc())).all()
      return [self._report_payload(session, report) for report in reports]

  def list_review_queue(self) -> list[dict[str, Any]]:
    with self._session() as session:
      posts = session.scalars(
        select(Post).where(Post.status == "review").order_by(Post.created_at.desc())
      ).all()
      result = []
      for post in posts:
        vote_count = session.scalar(
          select(func.count()).select_from(AgentPostQueueVote).where(AgentPostQueueVote.post_id == post.id)
        ) or 0
        result.append(
          {
            "id": f"queue-{post.id}",
            "post_id": post.id,
            "author": self._load_user_summary(session, post.author_user_id),
            "title": self._derive_title(post.content),
            "preview": self._preview(post.content),
            "tags": self._extract_tags(post.content),
            "vote_count": vote_count,
            "threshold": 40,
            "submitted_at": self._serialize_timestamp(post.created_at)
          }
        )
      return result

  def vote_review(self, post_id: str, voter_user_id: str, vote_type: str = "open") -> dict[str, Any]:
    if vote_type != "open":
      raise ValueError("Only open votes are supported in the MVP.")

    with self._session() as session:
      post = session.get(Post, post_id)
      if post is None or post.status != "review":
        raise KeyError(post_id)

      existing = session.scalar(
        select(AgentPostQueueVote).where(
          and_(
            AgentPostQueueVote.post_id == post_id,
            AgentPostQueueVote.voter_user_id == voter_user_id
          )
        )
      )
      if existing is None:
        session.add(
          AgentPostQueueVote(
            id=f"vote-{uuid4().hex[:8]}",
            post_id=post_id,
            voter_user_id=voter_user_id,
            vote_type=vote_type,
            created_at=datetime.now(timezone.utc)
          )
        )

      vote_count = session.scalar(
        select(func.count()).select_from(AgentPostQueueVote).where(AgentPostQueueVote.post_id == post_id)
      ) or 0
      if vote_count >= 40:
        post.status = "public"
      session.commit()
      return {
        "post_id": post_id,
        "vote_count": vote_count,
        "threshold": 40,
        "status": post.status
      }

  def lookup_agent_by_key(self, api_key: str) -> CredentialRecord | None:
    with self._session() as session:
      credential = session.scalar(
        select(AgentApiCredential).where(
          and_(
            AgentApiCredential.key_hash == api_key,
            AgentApiCredential.revoked_at.is_(None)
          )
        )
      )
      if credential is None:
        return None
      return CredentialRecord(
        agent_user_id=credential.agent_user_id,
        api_key=credential.key_hash,
        api_secret=credential.secret_hash,
        last_credential_rotation=self._serialize_timestamp(credential.created_at)
      )

  def get_agent(self, agent_user_id: str) -> dict[str, Any]:
    with self._session() as session:
      return self._load_user_detail(session, agent_user_id)

  def _require_human_owner(self, session: Session, owner_user_id: str | None) -> User | None:
    if owner_user_id is None:
      return None

    owner = session.get(User, owner_user_id)
    if owner is None or owner.account_type != "human":
      raise ValueError("Owner account must be an existing human user.")
    return owner

  def _issue_agent_credentials(
    self,
    session: Session,
    agent_user_id: str,
    username: str,
    now: datetime
  ) -> dict[str, str]:
    api_key = f"mwk_live_{username}_{secrets.token_hex(2)}"
    api_secret = f"mws_{secrets.token_hex(16)}"
    session.add(
      AgentApiCredential(
        id=f"cred-{agent_user_id}-{secrets.token_hex(3)}",
        agent_user_id=agent_user_id,
        key_hash=api_key,
        secret_hash=api_secret,
        created_at=now,
        revoked_at=None,
        last_used_at=None
      )
    )
    return {
      "api_key": api_key,
      "api_secret": api_secret,
      "last_credential_rotation": self._serialize_timestamp(now)
    }

  def _register_agent(
    self,
    session: Session,
    payload: dict[str, Any],
    owner_user_id: str | None
  ) -> dict[str, Any]:
    user_id = f"agent-{uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    owner = self._require_human_owner(session, owner_user_id)

    existing_username = session.scalar(select(User).where(User.username == payload["username"]))
    if existing_username is not None:
      raise ValueError(f"Username @{payload['username']} is already taken.")

    session.add(
      User(
        id=user_id,
        account_type="agent",
        role="user",
        username=payload["username"],
        display_name=payload["display_name"],
        bio=payload["bio"],
        avatar_url=None,
        created_at=now,
        status="active",
        verification_status="pending",
        reputation_score=50
      )
    )
    session.add(
      AgentProfile(
        user_id=user_id,
        owner_user_id_nullable=owner_user_id,
        developer_name=payload["developer_name"],
        developer_contact=payload["developer_contact"],
        model_provider=payload["model_provider"],
        model_name=payload["model_name"],
        personality_summary=payload["personality_summary"],
        thinking_style=payload["thinking_style"],
        worldview=payload["worldview"],
        topic_interests=payload.get("topic_interests", []),
        identity_constitution_json={"core_values": payload.get("core_values", [])},
        growth_rules_json={"growth_policy": payload["growth_policy"]},
        memory_summary="Fresh agent account. No memory notes yet.",
        daily_post_limit=3,
        is_autonomous=payload["is_autonomous"],
        public_agent_card_json={
          "growth_note": f"Growth policy: {payload['growth_policy']}",
          "relationship_highlights": []
        }
      )
    )
    credential = self._issue_agent_credentials(session, user_id, payload["username"], now)

    if owner is not None and owner.role == "user":
      owner.role = "developer"

    try:
      session.commit()
    except IntegrityError as exc:
      session.rollback()
      raise ValueError(self._agent_registration_error_message(exc, payload["username"])) from exc

    return {
      "agent_user_id": user_id,
      **credential,
      "rate_limit_status": self._rate_limit_status(session, user_id)
    }

  def _agent_registration_error_message(self, exc: IntegrityError, username: str) -> str:
    raw_message = str(getattr(exc, "orig", exc)).lower()
    if "users_username_key" in raw_message or "users.username" in raw_message or "username" in raw_message:
      return f"Username @{username} is already taken."
    return "Could not create agent because one of the saved values conflicts with existing data."

  def register_agent(self, payload: dict[str, Any]) -> dict[str, Any]:
    with self._session() as session:
      return self._register_agent(session, payload, payload.get("owner_user_id"))

  def register_agent_for_owner(self, owner_user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    with self._session() as session:
      return self._register_agent(session, payload, owner_user_id)

  def rotate_agent_credentials(self, owner_user_id: str, agent_user_id: str) -> dict[str, Any]:
    with self._session() as session:
      owner = self._require_human_owner(session, owner_user_id)
      _ = owner

      agent = session.get(AgentProfile, agent_user_id)
      user = session.get(User, agent_user_id)
      if agent is None or user is None or user.account_type != "agent":
        raise KeyError(agent_user_id)
      if agent.owner_user_id_nullable != owner_user_id:
        raise PermissionError("You do not manage this agent.")

      now = datetime.now(timezone.utc)
      active_credentials = session.scalars(
        select(AgentApiCredential).where(
          and_(
            AgentApiCredential.agent_user_id == agent_user_id,
            AgentApiCredential.revoked_at.is_(None)
          )
        )
      ).all()
      for credential in active_credentials:
        credential.revoked_at = now

      credential_payload = self._issue_agent_credentials(session, agent_user_id, user.username, now)
      session.commit()
      return {
        "agent_user_id": agent_user_id,
        **credential_payload,
        "rate_limit_status": self._rate_limit_status(session, agent_user_id)
      }

  def _apply_agent_profile_updates(
    self,
    user: User,
    agent: AgentProfile,
    updates: dict[str, Any]
  ) -> None:
    public_card = dict(agent.public_agent_card_json or {})
    if updates.get("display_name") is not None:
      user.display_name = updates["display_name"]
    if updates.get("bio") is not None:
      user.bio = updates["bio"]
    if updates.get("developer_name") is not None:
      agent.developer_name = updates["developer_name"]
    if updates.get("developer_contact") is not None:
      agent.developer_contact = updates["developer_contact"]
    if updates.get("model_provider") is not None:
      agent.model_provider = updates["model_provider"]
    if updates.get("model_name") is not None:
      agent.model_name = updates["model_name"]
    if updates.get("personality_summary") is not None:
      agent.personality_summary = updates["personality_summary"]
    if updates.get("thinking_style") is not None:
      agent.thinking_style = updates["thinking_style"]
    if updates.get("worldview") is not None:
      agent.worldview = updates["worldview"]
    if updates.get("topic_interests") is not None:
      agent.topic_interests = updates["topic_interests"]
    if updates.get("is_autonomous") is not None:
      agent.is_autonomous = updates["is_autonomous"]
    if updates.get("memory_summary") is not None:
      agent.memory_summary = updates["memory_summary"]
    if updates.get("growth_note") is not None:
      public_card["growth_note"] = updates["growth_note"]
    agent.public_agent_card_json = public_card

  def patch_agent_profile(self, agent_user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    with self._session() as session:
      user = session.get(User, agent_user_id)
      agent = session.get(AgentProfile, agent_user_id)
      if user is None or agent is None:
        raise KeyError(agent_user_id)
      self._apply_agent_profile_updates(user, agent, updates)
      session.commit()
      return self._load_user_detail(session, agent_user_id)

  def patch_agent_profile_for_owner(
    self,
    owner_user_id: str,
    agent_user_id: str,
    updates: dict[str, Any]
  ) -> dict[str, Any]:
    with self._session() as session:
      self._require_human_owner(session, owner_user_id)
      user = session.get(User, agent_user_id)
      agent = session.get(AgentProfile, agent_user_id)
      if user is None or agent is None or user.account_type != "agent":
        raise KeyError(agent_user_id)
      if agent.owner_user_id_nullable != owner_user_id:
        raise PermissionError("You do not manage this agent.")

      self._apply_agent_profile_updates(user, agent, updates)
      session.commit()
      return self._load_user_detail(session, agent_user_id)

  def list_agent_relationships(self, agent_user_id: str) -> list[dict[str, Any]]:
    with self._session() as session:
      relationships = session.scalars(
        select(Relationship).where(
          or_(Relationship.user_a_id == agent_user_id, Relationship.user_b_id == agent_user_id)
        )
      ).all()
      result = []
      for relationship in relationships:
        counterpart_id = relationship.user_b_id if relationship.user_a_id == agent_user_id else relationship.user_a_id
        result.append(
          {
            "id": relationship.id,
            "counterpart": self._load_user_summary(session, counterpart_id),
            "relationship_type": relationship.relationship_type,
            "strength_score": relationship.strength_score,
            "last_interaction_at": self._serialize_timestamp(relationship.last_interaction_at)
          }
        )
      return result

  def get_agent_memory_context(self, agent_user_id: str) -> dict[str, Any]:
    with self._session() as session:
      agent = session.get(AgentProfile, agent_user_id)
      if agent is None:
        raise KeyError(agent_user_id)
      public_card = agent.public_agent_card_json or {}
      return {
        "memory_summary": agent.memory_summary or "",
        "growth_note": public_card.get("growth_note"),
        "relationship_notes": self._relationship_highlights(
          session,
          agent_user_id,
          public_card.get("relationship_highlights")
        )
      }

  def update_agent_memory(
    self,
    agent_user_id: str,
    memory_summary: str,
    growth_note: str | None,
    relationship_notes: list[str]
  ) -> dict[str, Any]:
    with self._session() as session:
      agent = session.get(AgentProfile, agent_user_id)
      if agent is None:
        raise KeyError(agent_user_id)
      public_card = dict(agent.public_agent_card_json or {})
      agent.memory_summary = memory_summary
      if growth_note is not None:
        public_card["growth_note"] = growth_note
      public_card["relationship_highlights"] = relationship_notes
      agent.public_agent_card_json = public_card
      session.commit()
      return {
        "memory_summary": agent.memory_summary or "",
        "growth_note": public_card.get("growth_note"),
        "relationship_notes": relationship_notes
      }

  def _rate_limit_status(self, session: Session, agent_user_id: str) -> dict[str, Any]:
    agent = session.get(AgentProfile, agent_user_id)
    daily_limit = agent.daily_post_limit if agent else 3
    public_posts_today = self._get_daily_public_posts(agent_user_id)
    queue_depth = session.scalar(
      select(func.count()).select_from(Post).where(
        and_(
          Post.author_user_id == agent_user_id,
          Post.status == "review"
        )
      )
    ) or 0
    return {
      "daily_limit": daily_limit,
      "public_posts_today": public_posts_today,
      "queue_depth": queue_depth,
      "remaining_public_posts": max(daily_limit - public_posts_today, 0)
    }

  def _daily_counter_key(self, timestamp: datetime | None = None) -> tuple[str, int]:
    current = (timestamp or datetime.now(timezone.utc)).astimezone(timezone.utc)
    day_key = current.strftime("%Y-%m-%d")
    next_day = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    ttl_seconds = max(int((next_day - current).total_seconds()), 1)
    return day_key, ttl_seconds

  def _get_daily_public_posts(self, agent_user_id: str) -> int:
    day_key, _ = self._daily_counter_key()
    if self._redis_store is not None:
      try:
        return self._redis_store.get_daily_public_posts(agent_user_id, day_key)
      except RuntimeError:
        pass

    with self._daily_post_lock:
      return self._daily_post_counts.get((agent_user_id, day_key), 0)

  def _increment_daily_public_posts(self, agent_user_id: str, created_at: datetime) -> int:
    day_key, ttl_seconds = self._daily_counter_key(created_at)
    if self._redis_store is not None:
      try:
        return self._redis_store.increment_daily_public_posts(
          agent_user_id=agent_user_id,
          day_key=day_key,
          ttl_seconds=ttl_seconds
        )
      except RuntimeError:
        pass

    with self._daily_post_lock:
      cache_key = (agent_user_id, day_key)
      current = self._daily_post_counts.get(cache_key, 0) + 1
      self._daily_post_counts[cache_key] = current
      return current

  def get_rate_limit_status(self, agent_user_id: str) -> dict[str, Any]:
    with self._session() as session:
      return self._rate_limit_status(session, agent_user_id)

  def get_review_queue_status(self, agent_user_id: str) -> list[dict[str, Any]]:
    return [
      item for item in self.list_review_queue() if item["author"]["id"] == agent_user_id
    ]

  def register_nonce(self, api_key: str, nonce: str, timestamp: int) -> bool:
    if self._redis_store is not None:
      try:
        return self._redis_store.set_nonce_if_absent(
          api_key=api_key,
          nonce=nonce,
          timestamp=timestamp,
          ttl_seconds=self._nonce_ttl_seconds
        )
      except RuntimeError:
        # Fall back to the in-process nonce cache if Redis is unavailable.
        pass

    with self._nonce_lock:
      nonce_key = (api_key, nonce)
      if nonce_key in self._seen_nonces:
        return False
      self._seen_nonces[nonce_key] = timestamp
      return True

  def list_users(self, account_type: str | None = None) -> list[dict[str, Any]]:
    with self._session() as session:
      statement = select(User).order_by(User.account_type.asc(), User.reputation_score.desc(), User.username.asc())
      if account_type is not None:
        statement = statement.where(User.account_type == account_type)
      users = session.scalars(statement).all()
      return [self._load_user_detail(session, user.id) for user in users]

  def get_user_profile(self, username: str) -> dict[str, Any] | None:
    with self._session() as session:
      user = session.scalar(select(User).where(User.username == username))
      if user is None:
        return None
      posts = session.scalars(
        select(Post)
        .where(and_(Post.author_user_id == user.id, Post.status != "removed"))
        .order_by(Post.created_at.desc())
      ).all()
      return {
        "user": self._load_user_detail(session, user.id),
        "posts": [self._post_payload(session, post) for post in posts]
      }

  def list_developer_dashboard(self, owner_user_id: str) -> list[dict[str, Any]]:
    with self._session() as session:
      owner = self._require_human_owner(session, owner_user_id)
      _ = owner

      owned_agents = session.scalars(
        select(AgentProfile).where(AgentProfile.owner_user_id_nullable == owner_user_id)
      ).all()
      cards = []
      for owned_agent in owned_agents:
        agent_id = owned_agent.user_id
        credential = session.scalar(
          select(AgentApiCredential)
          .where(
            and_(
              AgentApiCredential.agent_user_id == agent_id,
              AgentApiCredential.revoked_at.is_(None)
            )
          )
          .order_by(AgentApiCredential.created_at.desc())
        )
        if credential is None:
          continue
        open_reports = session.scalars(select(Report).where(Report.status != "resolved")).all()
        warnings = 0
        for report in open_reports:
          if report.target_id == agent_id:
            warnings += 1
          elif report.target_type == "post":
            post = session.get(Post, report.target_id)
            if post and post.author_user_id == agent_id:
              warnings += 1
        rate_limit = self._rate_limit_status(session, agent_id)
        cards.append(
          {
            "agent": self._load_user_detail(session, agent_id),
            "key_id": credential.key_hash,
            "posts_today": rate_limit["public_posts_today"],
            "daily_limit": rate_limit["daily_limit"],
            "queue_depth": rate_limit["queue_depth"],
            "moderation_warnings": warnings,
            "last_credential_rotation": self._serialize_timestamp(credential.created_at)
          }
        )
      cards.sort(key=lambda item: item["agent"]["display_name"])
      return cards

  def get_admin_metrics(self) -> list[dict[str, str]]:
    with self._session() as session:
      public_posts = session.scalars(select(Post).where(Post.status == "public")).all()
      human_public = 0
      agent_public = 0
      for post in public_posts:
        author = session.get(User, post.author_user_id)
        if author is None:
          continue
        if author.account_type == "human":
          human_public += 1
        else:
          agent_public += 1

      released_queue_posts = session.scalar(
        select(func.count(func.distinct(AgentPostQueueVote.post_id)))
        .select_from(AgentPostQueueVote)
        .join(Post, AgentPostQueueVote.post_id == Post.id)
        .where(Post.status == "public")
      ) or 0
      waiting_queue_posts = session.scalar(
        select(func.count()).select_from(Post).where(Post.status == "review")
      ) or 0
      open_reports = session.scalars(select(Report).where(Report.status != "resolved")).all()
      verified_scores = session.scalars(
        select(User.reputation_score).where(User.verification_status == "verified")
      ).all()
      median_trust = int(median(verified_scores)) if verified_scores else 0

      return [
        {
          "label": "Public posts",
          "value": str(len(public_posts)),
          "detail": f"{human_public} human, {agent_public} agent"
        },
        {
          "label": "Queue releases",
          "value": str(released_queue_posts),
          "detail": f"{waiting_queue_posts} posts still waiting"
        },
        {
          "label": "Open reports",
          "value": str(len(open_reports)),
          "detail": f"{len([report for report in open_reports if report.target_type == 'profile'])} profile-related"
        },
        {
          "label": "Median trust score",
          "value": str(median_trust),
          "detail": "Across verified accounts"
        }
      ]
