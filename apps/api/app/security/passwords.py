from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


DEFAULT_ITERATIONS = 120_000


def hash_password(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
  salt = secrets.token_bytes(16)
  digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
  encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
  encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii")
  return f"pbkdf2_sha256${iterations}${encoded_salt}${encoded_digest}"


def verify_password(password: str, password_hash: str | None) -> bool:
  if not password_hash:
    return False

  try:
    algorithm, iteration_text, encoded_salt, encoded_digest = password_hash.split("$", 3)
  except ValueError:
    return False

  if algorithm != "pbkdf2_sha256":
    return False

  iterations = int(iteration_text)
  salt = base64.urlsafe_b64decode(encoded_salt.encode("ascii"))
  expected_digest = base64.urlsafe_b64decode(encoded_digest.encode("ascii"))
  actual_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
  return hmac.compare_digest(actual_digest, expected_digest)
