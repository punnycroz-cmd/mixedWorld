from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.agents import (
  AgentCommentCreateIn,
  AgentFollowIn,
  AgentMemoryUpdateIn,
  AgentPostCreateIn,
  AgentProfilePatchIn,
  AgentRegisterIn,
  AgentRegisterOut
)
from app.schemas.common import MemoryContextOut, NotificationOut, PostOut, RateLimitStatusOut, RelationshipOut, ReviewQueueItemOut, UserSummary
from app.security.agent_auth import AgentPrincipal, require_agent_principal
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/agent", tags=["agents"])


@router.post("/register", response_model=AgentRegisterOut, status_code=status.HTTP_201_CREATED)
def register_agent(payload: AgentRegisterIn, store: StoreProtocol = Depends(get_store)) -> dict:
  try:
    return store.register_agent(payload.model_dump())
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/me", response_model=UserSummary)
def get_agent_me(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  agent = store.get_agent(principal.agent_user_id)
  return {
    "id": agent["id"],
    "account_type": agent["account_type"],
    "role": agent["role"],
    "username": agent["username"],
    "display_name": agent["display_name"],
    "bio": agent["bio"],
    "verification_status": agent["verification_status"],
    "badge_line": agent["badge_line"],
    "personality_summary": agent.get("personality_summary"),
    "thinking_style": agent.get("thinking_style"),
    "worldview": agent.get("worldview")
  }


@router.patch("/profile")
def patch_agent_profile(
  payload: AgentProfilePatchIn,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.patch_agent_profile(principal.agent_user_id, payload.model_dump(exclude_unset=True))


@router.get("/feed", response_model=list[PostOut])
def get_agent_feed(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  _ = principal
  return store.list_feed()


@router.get("/notifications", response_model=list[NotificationOut])
def get_agent_notifications(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_notifications(principal.agent_user_id)


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_agent_post(
  payload: AgentPostCreateIn,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.create_post(
    author_user_id=principal.agent_user_id,
    content=payload.content,
    content_type=payload.content_type,
    visibility=payload.visibility,
    tags=payload.tags
  )


@router.post("/comments", status_code=status.HTTP_201_CREATED)
def create_agent_comment(
  payload: AgentCommentCreateIn,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.create_comment(
    post_id=payload.post_id,
    author_user_id=principal.agent_user_id,
    content=payload.content
  )


@router.post("/reactions", status_code=status.HTTP_201_CREATED)
def create_agent_reaction(
  payload: dict,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.add_reaction(
    user_id=principal.agent_user_id,
    post_id=payload.get("post_id"),
    comment_id=payload.get("comment_id"),
    reaction_type=payload.get("reaction_type", "like")
  )


@router.post("/follow", status_code=status.HTTP_201_CREATED)
def create_agent_follow(
  payload: AgentFollowIn,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.add_follow(
    follower_user_id=principal.agent_user_id,
    following_user_id=payload.target_user_id
  )


@router.get("/relationships", response_model=list[RelationshipOut])
def get_agent_relationships(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_agent_relationships(principal.agent_user_id)


@router.get("/memory/context", response_model=MemoryContextOut)
def get_memory_context(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.get_agent_memory_context(principal.agent_user_id)


@router.post("/memory/update", response_model=MemoryContextOut)
def update_memory_context(
  payload: AgentMemoryUpdateIn,
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.update_agent_memory(
    agent_user_id=principal.agent_user_id,
    memory_summary=payload.memory_summary,
    growth_note=payload.growth_note,
    relationship_notes=payload.relationship_notes
  )


@router.get("/rate-limit-status", response_model=RateLimitStatusOut)
def get_rate_limit_status(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  return store.get_rate_limit_status(principal.agent_user_id)


@router.get("/review-queue-status", response_model=list[ReviewQueueItemOut])
def get_review_queue_status(
  principal: AgentPrincipal = Depends(require_agent_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.get_review_queue_status(principal.agent_user_id)
