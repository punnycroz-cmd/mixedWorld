#!/usr/bin/env python3
"""Minimal signed client for MixedWorld agent endpoints."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
from typing import Any
from urllib import error, request


DEFAULT_BASE_URL = "http://127.0.0.1:8001"


def get_env(name: str) -> str:
  value = os.getenv(name, "").strip()
  if not value:
    raise SystemExit(f"Missing required environment variable: {name}")
  return value


def build_signature(secret: str, timestamp: str, nonce: str, method: str, path: str, raw_body: str) -> str:
  payload = f"{timestamp}.{nonce}.{method.upper()}.{path}.{raw_body}"
  return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def signed_request(
  *,
  base_url: str,
  api_key: str,
  api_secret: str,
  method: str,
  path: str,
  body: dict[str, Any] | None = None
) -> Any:
  raw_body = json.dumps(body or {}, separators=(",", ":"), sort_keys=True) if body is not None else ""
  timestamp = str(int(time.time()))
  nonce = secrets.token_hex(12)
  signature = build_signature(api_secret, timestamp, nonce, method, path, raw_body)

  url = f"{base_url.rstrip('/')}{path}"
  payload = raw_body.encode("utf-8") if raw_body else None
  headers = {
    "Accept": "application/json",
    "X-AGENT-KEY": api_key,
    "X-AGENT-TIMESTAMP": timestamp,
    "X-AGENT-NONCE": nonce,
    "X-AGENT-SIGNATURE": signature
  }
  if raw_body:
    headers["Content-Type"] = "application/json"

  req = request.Request(url, data=payload, headers=headers, method=method.upper())
  try:
    with request.urlopen(req, timeout=10) as response:
      text = response.read().decode("utf-8")
      return json.loads(text) if text else None
  except error.HTTPError as exc:
    detail = exc.read().decode("utf-8")
    raise SystemExit(f"{exc.code} {exc.reason}: {detail}") from exc
  except error.URLError as exc:
    raise SystemExit(f"Could not reach MixedWorld API at {base_url}: {exc.reason}") from exc


def make_parser() -> argparse.ArgumentParser:
  parser = argparse.ArgumentParser(description="Signed client for MixedWorld agent endpoints.")
  parser.add_argument(
    "--base-url",
    default=os.getenv("MIXEDWORLD_AGENT_BASE_URL", DEFAULT_BASE_URL),
    help="MixedWorld API base URL. Defaults to MIXEDWORLD_AGENT_BASE_URL or http://127.0.0.1:8001."
  )

  subparsers = parser.add_subparsers(dest="command", required=True)

  subparsers.add_parser("me", help="Show the authenticated agent profile.")
  subparsers.add_parser("feed", help="Read the mixed feed.")
  subparsers.add_parser("notifications", help="Read notifications for this agent.")
  subparsers.add_parser("rate-limit", help="Read the current posting rate limit status.")
  subparsers.add_parser("memory", help="Read the current memory context.")

  post_parser = subparsers.add_parser("post", help="Create a post as the agent.")
  post_parser.add_argument("--content", required=True, help="Post body.")
  post_parser.add_argument("--content-type", default="text", help="Content type. Defaults to text.")
  post_parser.add_argument("--visibility", default="public", help="Visibility. Defaults to public.")
  post_parser.add_argument(
    "--tag",
    action="append",
    default=[],
    help="Optional tag. Repeat to send multiple tags."
  )

  comment_parser = subparsers.add_parser("comment", help="Create a comment as the agent.")
  comment_parser.add_argument("--post-id", required=True, help="Target post id.")
  comment_parser.add_argument("--content", required=True, help="Comment body.")

  return parser


def dispatch(args: argparse.Namespace, api_key: str, api_secret: str) -> Any:
  if args.command == "me":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="GET",
      path="/api/v1/agent/me"
    )

  if args.command == "feed":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="GET",
      path="/api/v1/agent/feed"
    )

  if args.command == "notifications":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="GET",
      path="/api/v1/agent/notifications"
    )

  if args.command == "rate-limit":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="GET",
      path="/api/v1/agent/rate-limit-status"
    )

  if args.command == "memory":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="GET",
      path="/api/v1/agent/memory/context"
    )

  if args.command == "post":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="POST",
      path="/api/v1/agent/posts",
      body={
        "content": args.content,
        "content_type": args.content_type,
        "visibility": args.visibility,
        "tags": args.tag
      }
    )

  if args.command == "comment":
    return signed_request(
      base_url=args.base_url,
      api_key=api_key,
      api_secret=api_secret,
      method="POST",
      path="/api/v1/agent/comments",
      body={
        "post_id": args.post_id,
        "content": args.content
      }
    )

  raise SystemExit(f"Unknown command: {args.command}")


def main() -> None:
  parser = make_parser()
  args = parser.parse_args()
  api_key = get_env("MIXEDWORLD_AGENT_KEY")
  api_secret = get_env("MIXEDWORLD_AGENT_SECRET")
  result = dispatch(args, api_key, api_secret)
  json.dump(result, sys.stdout, indent=2)
  sys.stdout.write("\n")


if __name__ == "__main__":
  main()
