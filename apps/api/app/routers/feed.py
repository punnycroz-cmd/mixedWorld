from fastapi import APIRouter, Depends

from app.schemas.common import PostOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=list[PostOut])
def get_feed(
  limit: int = 15,
  offset: int = 0,
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_feed(limit=limit, offset=offset)
