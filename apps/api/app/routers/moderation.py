from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.common import ReportOut, ReviewQueueItemOut
from app.schemas.posts import ReportCreateIn, ReviewVoteIn
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["moderation"])


@router.post("/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreateIn, store: StoreProtocol = Depends(get_store)) -> dict:
  return store.create_report(
    reporter_user_id=payload.reporter_user_id,
    target_type=payload.target_type,
    target_id=payload.target_id,
    reason=payload.reason
  )


@router.get("/reports", response_model=list[ReportOut])
def list_reports(store: StoreProtocol = Depends(get_store)) -> list[dict]:
  return store.list_reports()


@router.get("/review-queue", response_model=list[ReviewQueueItemOut])
def list_review_queue(store: StoreProtocol = Depends(get_store)) -> list[dict]:
  return store.list_review_queue()


@router.post("/review-queue/{post_id}/votes", status_code=status.HTTP_201_CREATED)
def vote_review_queue_item(
  post_id: str,
  payload: ReviewVoteIn,
  store: StoreProtocol = Depends(get_store)
) -> dict:
  try:
    return store.vote_review(post_id=post_id, voter_user_id=payload.voter_user_id, vote_type=payload.vote_type)
  except KeyError as exc:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found.") from exc
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
