import tempfile
import unittest
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_store import DatabaseStore


class FakeRedisStore:
  def __init__(self) -> None:
    self.calls: list[tuple[str, str, int, int]] = []
    self.accept_first = True
    self.rate_limit_value = 0
    self.rate_limit_calls: list[tuple[str, str, int]] = []

  def set_nonce_if_absent(self, api_key: str, nonce: str, timestamp: int, ttl_seconds: int) -> bool:
    self.calls.append((api_key, nonce, timestamp, ttl_seconds))
    accepted = self.accept_first
    self.accept_first = False
    return accepted

  def increment_daily_public_posts(self, agent_user_id: str, day_key: str, ttl_seconds: int) -> int:
    self.rate_limit_calls.append((agent_user_id, day_key, ttl_seconds))
    self.rate_limit_value += 1
    return self.rate_limit_value

  def get_daily_public_posts(self, agent_user_id: str, day_key: str) -> int:
    _ = (agent_user_id, day_key)
    return self.rate_limit_value


class RedisNonceStoreTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.db_path = Path(self.temp_dir.name) / "redis-nonce.sqlite3"
    self.engine = create_engine(
      f"sqlite+pysqlite:///{self.db_path}",
      future=True,
      connect_args={"check_same_thread": False}
    )
    self.session_factory = sessionmaker(
      bind=self.engine,
      autoflush=False,
      autocommit=False,
      expire_on_commit=False,
      future=True
    )

  def tearDown(self) -> None:
    self.engine.dispose()
    self.temp_dir.cleanup()

  def test_register_nonce_prefers_redis_store(self) -> None:
    redis_store = FakeRedisStore()
    store = DatabaseStore(
      engine=self.engine,
      session_factory=self.session_factory,
      redis_store=redis_store,
      nonce_ttl_seconds=300
    )

    self.assertTrue(store.register_nonce("key-1", "nonce-1", 1710000000))
    self.assertFalse(store.register_nonce("key-1", "nonce-1", 1710000000))
    self.assertEqual(
      redis_store.calls,
      [
        ("key-1", "nonce-1", 1710000000, 300),
        ("key-1", "nonce-1", 1710000000, 300)
      ]
    )

  def test_rate_limit_prefers_redis_store(self) -> None:
    redis_store = FakeRedisStore()
    store = DatabaseStore(
      engine=self.engine,
      session_factory=self.session_factory,
      redis_store=redis_store,
      nonce_ttl_seconds=300
    )
    store.initialize()

    first = store.create_post("agent-solace", "Redis-backed rate-limit check one.")
    second = store.create_post("agent-solace", "Redis-backed rate-limit check two.")
    status = store.get_rate_limit_status("agent-solace")

    self.assertEqual(first["status"], "public")
    self.assertEqual(second["status"], "public")
    self.assertEqual(status["public_posts_today"], 2)
    self.assertEqual(len(redis_store.rate_limit_calls), 2)


if __name__ == "__main__":
  unittest.main()
