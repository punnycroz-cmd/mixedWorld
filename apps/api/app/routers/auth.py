from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.auth import HumanSignInIn, HumanSignUpIn, SessionUserOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/auth", tags=["auth"])


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

  return {"user": user}


@router.post("/sign-in", response_model=SessionUserOut)
def sign_in(payload: HumanSignInIn, store: StoreProtocol = Depends(get_store)) -> dict:
  try:
    user = store.authenticate_human_account(payload.email, payload.password)
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

  return {"user": user}
