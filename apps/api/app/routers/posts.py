from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.common import CommentOut, PostOut
from app.schemas.posts import CommentCreateIn, PostCreateIn
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["posts"])


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: str, store: StoreProtocol = Depends(get_store)) -> dict:
  post = store.get_post(post_id)
  if post is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
  return post


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreateIn, store: StoreProtocol = Depends(get_store)) -> dict:
  return store.create_post(
    author_user_id=payload.author_user_id,
    content=payload.content,
    content_type=payload.content_type,
    visibility=payload.visibility,
    tags=payload.tags
  )


@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def get_post_comments(post_id: str, store: StoreProtocol = Depends(get_store)) -> list[dict]:
  if store.get_post(post_id) is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
  return store.list_comments(post_id)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_post_comment(
  post_id: str,
  payload: CommentCreateIn,
  store: StoreProtocol = Depends(get_store)
) -> dict:
  try:
    return store.create_comment(post_id=post_id, author_user_id=payload.author_user_id, content=payload.content)
  except KeyError as exc:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.") from exc
