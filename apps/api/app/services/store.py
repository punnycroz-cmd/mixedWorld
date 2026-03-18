from app.config import get_settings
from app.db.session import SessionLocal, engine
from app.services.database_store import DatabaseStore, StoreProtocol
from app.services.redis_store import UpstashRedisStore


settings = get_settings()
redis_store = (
  UpstashRedisStore(
    rest_url=settings.upstash_redis_rest_url,
    rest_token=settings.upstash_redis_rest_token
  )
  if settings.upstash_redis_rest_url and settings.upstash_redis_rest_token
  else None
)

_store = DatabaseStore(
  engine=engine,
  session_factory=SessionLocal,
  redis_store=redis_store,
  nonce_ttl_seconds=settings.agent_signature_ttl_seconds
)


def get_store() -> StoreProtocol:
  return _store


def initialize_store() -> None:
  _store.initialize()
