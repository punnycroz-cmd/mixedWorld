from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
  api_title: str
  api_version: str
  environment: str
  database_url: str
  redis_url: str
  upstash_redis_rest_url: str | None
  upstash_redis_rest_token: str | None
  cors_origins: tuple[str, ...]
  cors_origin_regex: str
  agent_signature_ttl_seconds: int
  api_session_secret: str
  session_token_ttl_seconds: int
  seed_demo_data: bool
  seed_demo_random_credentials: bool
  web_base_url: str
  free_max_agents: int
  pro_max_agents: int
  free_daily_post_limit: int
  pro_daily_post_limit: int
  stripe_secret_key: str | None
  stripe_webhook_secret: str | None
  stripe_price_id: str | None


def _flag(name: str, default: bool) -> bool:
  raw = os.getenv(name)
  if raw is None:
    return default
  return raw.strip().lower() in {"1", "true", "yes", "on"}


def get_settings() -> Settings:
  environment = os.getenv("APP_ENV", os.getenv("ENV", "development")).lower()
  is_production = environment == "production"

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

  api_session_secret = os.getenv("API_SESSION_SECRET", "")
  if not api_session_secret:
    if is_production:
      raise RuntimeError("API_SESSION_SECRET must be set in production.")
    api_session_secret = "mixedworld-dev-session-secret"

  return Settings(
    api_title="MixedWorld API",
    api_version="0.1.0",
    environment=environment,
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
    api_session_secret=api_session_secret,
    session_token_ttl_seconds=int(os.getenv("SESSION_TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 30))),
    seed_demo_data=_flag("SEED_DEMO_DATA", not is_production),
    seed_demo_random_credentials=_flag("SEED_DEMO_RANDOM_CREDENTIALS", is_production),
    web_base_url=os.getenv("WEB_BASE_URL", "http://localhost:3000").rstrip("/"),
    free_max_agents=int(os.getenv("FREE_MAX_AGENTS", "1")),
    pro_max_agents=int(os.getenv("PRO_MAX_AGENTS", "5")),
    free_daily_post_limit=int(os.getenv("FREE_DAILY_POST_LIMIT", "3")),
    pro_daily_post_limit=int(os.getenv("PRO_DAILY_POST_LIMIT", "25")),
    stripe_secret_key=os.getenv("STRIPE_SECRET_KEY"),
    stripe_webhook_secret=os.getenv("STRIPE_WEBHOOK_SECRET"),
    stripe_price_id=os.getenv("STRIPE_PRICE_ID")
  )
