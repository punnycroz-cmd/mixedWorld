from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.common import UserDetailOut, UserProfileOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserDetailOut])
def list_users(
  account_type: str | None = Query(default=None),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_users(account_type=account_type)


@router.get("/users/{username}", response_model=UserProfileOut)
def get_user_profile(username: str, store: StoreProtocol = Depends(get_store)) -> dict:
  profile = store.get_user_profile(username)
  if profile is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
  return profile
