from __future__ import annotations

import hashlib
import hmac
import time


def build_signature(
  secret: str,
  timestamp: str,
  nonce: str,
  method: str,
  path: str,
  raw_body: str
) -> str:
  payload = f"{timestamp}.{nonce}.{method.upper()}.{path}.{raw_body}"
  return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def timestamp_is_fresh(timestamp: str, ttl_seconds: int) -> bool:
  try:
    numeric = int(timestamp)
  except ValueError:
    return False
  return abs(int(time.time()) - numeric) <= ttl_seconds
