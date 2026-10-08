from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.schemas.auth import HumanSignInIn, HumanSignUpIn, SessionUserOut
from app.security.session_tokens import issue_session_token
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/auth", tags=["auth"])


def _session_response(user: dict) -> dict:
  settings = get_settings()
  api_token = issue_session_token(
    user_id=user["id"],
    role=user["role"],
    account_type=user["account_type"],
    secret=settings.api_session_secret,
    ttl_seconds=settings.session_token_ttl_seconds
  )
  return {"user": user, "api_token": api_token}


@router.post("/sign-up", response_model=SessionUserOut, status_code=status.HTTP_201_CREATED)
def sign_up(payload: HumanSignUpIn, store: StoreProtocol = Depends(get_store)) -> dict:
  try:
    user = store.register_human_account(
      display_name=payload.display_name,
      username=payload.username,
      email=payload.email,
      password=payload.password,
      locale=payload.locale
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

  return _session_response(user)


@router.post("/sign-in", response_model=SessionUserOut)
def sign_in(payload: HumanSignInIn, store: StoreProtocol = Depends(get_store)) -> dict:
  try:
    user = store.authenticate_human_account(payload.email, payload.password)
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

  return _session_response(user)
