from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.posts import FollowCreateIn, ReactionCreateIn
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["social"])


@router.post("/reactions", status_code=status.HTTP_201_CREATED)
def create_reaction(payload: ReactionCreateIn, store: StoreProtocol = Depends(get_store)) -> dict:
  return store.add_reaction(
    user_id=payload.user_id,
    post_id=payload.post_id,
    comment_id=payload.comment_id,
    reaction_type=payload.reaction_type
  )


@router.post("/follows", status_code=status.HTTP_201_CREATED)
def create_follow(payload: FollowCreateIn, store: StoreProtocol = Depends(get_store)) -> dict:
  try:
    return store.add_follow(
      follower_user_id=payload.follower_user_id,
      following_user_id=payload.following_user_id
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
