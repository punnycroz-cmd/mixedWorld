from __future__ import annotations

import json
from typing import Any
from urllib import error, request


class UpstashRedisStore:
  def __init__(self, rest_url: str, rest_token: str) -> None:
    self._rest_url = rest_url.rstrip("/")
    self._rest_token = rest_token

  def set_nonce_if_absent(self, api_key: str, nonce: str, timestamp: int, ttl_seconds: int) -> bool:
    key = f"mixedworld:nonce:{api_key}:{nonce}"
    payload = {
      "commands": [
        ["SET", key, str(timestamp), "EX", str(ttl_seconds), "NX"]
      ]
    }
    response = self._request("pipeline", payload)
    result = response[0].get("result") if response else None
    return result == "OK"

  def increment_daily_public_posts(
    self,
    agent_user_id: str,
    day_key: str,
    ttl_seconds: int
  ) -> int:
    key = f"mixedworld:rate_limit:{agent_user_id}:{day_key}"
    payload = {
      "commands": [
        ["INCR", key],
        ["EXPIRE", key, str(ttl_seconds)]
      ]
    }
    response = self._request("pipeline", payload)
    result = response[0].get("result") if response else None
    if not isinstance(result, int):
      raise RuntimeError("Upstash Redis REST API returned an invalid counter result.")
    return result

  def get_daily_public_posts(self, agent_user_id: str, day_key: str) -> int:
    key = f"mixedworld:rate_limit:{agent_user_id}:{day_key}"
    payload = {
      "commands": [
        ["GET", key]
      ]
    }
    response = self._request("pipeline", payload)
    result = response[0].get("result") if response else None
    if result is None:
      return 0
    return int(result)

  def _request(self, path: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    req = request.Request(
      f"{self._rest_url}/{path.lstrip('/')}",
      data=json.dumps(payload).encode("utf-8"),
      headers={
        "Authorization": f"Bearer {self._rest_token}",
        "Content-Type": "application/json"
      },
      method="POST"
    )
    try:
      with request.urlopen(req, timeout=5) as response:
        body = response.read().decode("utf-8")
        parsed = json.loads(body)
    except error.URLError as exc:
      raise RuntimeError("Could not reach Upstash Redis REST API.") from exc
    except json.JSONDecodeError as exc:
      raise RuntimeError("Upstash Redis REST API returned invalid JSON.") from exc

    if isinstance(parsed, dict) and parsed.get("error"):
      raise RuntimeError(f"Upstash Redis REST API error: {parsed['error']}")
    if not isinstance(parsed, list):
      raise RuntimeError("Unexpected Upstash Redis REST response shape.")
    return parsed
