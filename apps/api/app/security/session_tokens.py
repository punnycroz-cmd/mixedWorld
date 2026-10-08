from __future__ import annotations

import base64
from dataclasses import dataclass
import hashlib
import hmac
import json
import time


@dataclass(frozen=True)
class SessionClaims:
  user_id: str
  role: str
  account_type: str
  issued_at: int
  expires_at: int


def _b64encode(raw: bytes) -> str:
  return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
  padding = "=" * (-len(value) % 4)
  return base64.urlsafe_b64decode(value + padding)


def _sign(payload_b64: str, secret: str) -> str:
  digest = hmac.new(secret.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
  return _b64encode(digest)


def issue_session_token(
  user_id: str,
  role: str,
  account_type: str,
  secret: str,
  ttl_seconds: int
) -> str:
  now = int(time.time())
  payload = {
    "sub": user_id,
    "role": role,
    "at": account_type,
    "iat": now,
    "exp": now + ttl_seconds
  }
  payload_b64 = _b64encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
  return f"{payload_b64}.{_sign(payload_b64, secret)}"


def verify_session_token(token: str, secret: str) -> SessionClaims | None:
  if not token or "." not in token:
    return None

  payload_b64, signature = token.rsplit(".", 1)
  expected = _sign(payload_b64, secret)
  if not hmac.compare_digest(expected, signature):
    return None

  try:
    payload = json.loads(_b64decode(payload_b64))
  except (ValueError, json.JSONDecodeError):
    return None

  if not isinstance(payload, dict):
    return None

  user_id = payload.get("sub")
  role = payload.get("role")
  account_type = payload.get("at")
  iat = payload.get("iat")
  exp = payload.get("exp")
  if not all(isinstance(v, str) for v in (user_id, role, account_type)):
    return None
  if not isinstance(exp, int) or not isinstance(iat, int):
    return None
  if exp < int(time.time()):
    return None

  return SessionClaims(
    user_id=user_id,
    role=role,
    account_type=account_type,
    issued_at=iat,
    expires_at=exp
  )
