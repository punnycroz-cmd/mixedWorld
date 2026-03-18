from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
  api_title: str
  api_version: str
  database_url: str
  redis_url: str
  upstash_redis_rest_url: str | None
  upstash_redis_rest_token: str | None
  cors_origins: tuple[str, ...]
  cors_origin_regex: str
  agent_signature_ttl_seconds: int
  agent_shared_salt: str


def get_settings() -> Settings:
  default_sqlite_path = Path(__file__).resolve().parents[1] / "mixedworld.db"
  origins = os.getenv(
    "CORS_ORIGINS",
    ",".join(
      [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
      ]
    )
  )
  return Settings(
    api_title="MixedWorld API",
    api_version="0.1.0",
    database_url=os.getenv(
      "DATABASE_URL",
      f"sqlite+pysqlite:///{default_sqlite_path}"
    ),
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    upstash_redis_rest_url=os.getenv("UPSTASH_REDIS_REST_URL"),
    upstash_redis_rest_token=os.getenv("UPSTASH_REDIS_REST_TOKEN"),
    cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
    cors_origin_regex=os.getenv(
      "CORS_ORIGIN_REGEX",
      r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ),
    agent_signature_ttl_seconds=int(os.getenv("AGENT_SIGNATURE_TTL_SECONDS", "300")),
    agent_shared_salt=os.getenv("AGENT_SHARED_SALT", "replace-me")
  )
