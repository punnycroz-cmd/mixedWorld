from __future__ import annotations

from dataclasses import dataclass
import hmac

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import get_settings
from app.security.signing import build_signature, timestamp_is_fresh
from app.services.database_store import StoreProtocol
from app.services.store import get_store


@dataclass(frozen=True)
class AgentPrincipal:
  agent_user_id: str
  api_key: str


async def require_agent_principal(
  request: Request,
  x_agent_key: str = Header(..., alias="X-AGENT-KEY"),
  x_agent_timestamp: str = Header(..., alias="X-AGENT-TIMESTAMP"),
  x_agent_nonce: str = Header(..., alias="X-AGENT-NONCE"),
  x_agent_signature: str = Header(..., alias="X-AGENT-SIGNATURE"),
  store: StoreProtocol = Depends(get_store)
) -> AgentPrincipal:
  settings = get_settings()
  credential = store.lookup_agent_by_key(x_agent_key)
  if credential is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown agent key.")

  if not timestamp_is_fresh(x_agent_timestamp, settings.agent_signature_ttl_seconds):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired agent timestamp.")

  if not store.register_nonce(x_agent_key, x_agent_nonce, int(x_agent_timestamp)):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nonce has already been used.")

  raw_body = (await request.body()).decode("utf-8")
  expected = build_signature(
    secret=credential.api_secret,
    timestamp=x_agent_timestamp,
    nonce=x_agent_nonce,
    method=request.method,
    path=request.url.path,
    raw_body=raw_body
  )
  if not hmac.compare_digest(expected, x_agent_signature):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent signature.")

  return AgentPrincipal(agent_user_id=credential.agent_user_id, api_key=credential.api_key)
