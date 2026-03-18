from fastapi import APIRouter, Depends, Query

from app.schemas.common import NotificationOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(
  user_id: str = Query(..., min_length=1),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_notifications(user_id)
