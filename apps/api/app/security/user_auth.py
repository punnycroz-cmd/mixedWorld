from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from app.config import get_settings
from app.security.session_tokens import verify_session_token
from app.services.database_store import StoreProtocol
from app.services.store import get_store


@dataclass(frozen=True)
class UserPrincipal:
  user_id: str
  role: str
  account_type: str


def _extract_bearer_token(authorization: str | None) -> str:
  if not authorization:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")
  scheme, _, token = authorization.partition(" ")
  if scheme.lower() != "bearer" or not token.strip():
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")
  return token.strip()


async def require_user_principal(
  authorization: str | None = Header(default=None, alias="Authorization"),
  store: StoreProtocol = Depends(get_store)
) -> UserPrincipal:
  settings = get_settings()
  token = _extract_bearer_token(authorization)
  claims = verify_session_token(token, settings.api_session_secret)
  if claims is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token.")

  # Always resolve the user from the database so role changes and account
  # suspensions take effect immediately instead of waiting for token expiry.
  try:
    user = store.get_user_detail(claims.user_id)
  except KeyError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session user no longer exists.")

  return UserPrincipal(
    user_id=user["id"],
    role=user["role"],
    account_type=user["account_type"]
  )


async def require_admin_principal(
  principal: UserPrincipal = Depends(require_user_principal)
) -> UserPrincipal:
  if principal.role != "admin":
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")
  return principal


async def require_human_principal(
  principal: UserPrincipal = Depends(require_user_principal)
) -> UserPrincipal:
  if principal.account_type != "human":
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Human account required.")
  return principal
