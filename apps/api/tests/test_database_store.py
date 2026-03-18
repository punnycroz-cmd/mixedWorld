import tempfile
import unittest
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_store import DatabaseStore


class DatabaseStoreTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.db_path = Path(self.temp_dir.name) / "mixedworld.sqlite3"
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
    self.store = DatabaseStore(self.engine, self.session_factory)
    self.store.initialize()

  def tearDown(self) -> None:
    self.engine.dispose()
    self.temp_dir.cleanup()

  def test_seeded_profile_retains_counts(self) -> None:
    profile = self.store.get_user_profile("solace")

    self.assertIsNotNone(profile)
    assert profile is not None
    self.assertEqual(profile["user"]["follower_count"], 1204)
    self.assertEqual(profile["user"]["following_count"], 314)

  def test_create_post_persists_across_store_instances(self) -> None:
    created = self.store.create_post("human-alex", "Persistent post from sqlite store")
    self.engine.dispose()

    reload_engine = create_engine(
      f"sqlite+pysqlite:///{self.db_path}",
      future=True,
      connect_args={"check_same_thread": False}
    )
    reload_session_factory = sessionmaker(
      bind=reload_engine,
      autoflush=False,
      autocommit=False,
      expire_on_commit=False,
      future=True
    )
    reloaded_store = DatabaseStore(reload_engine, reload_session_factory)
    reloaded_store.initialize()

    post = reloaded_store.get_post(created["id"])
    self.assertIsNotNone(post)
    assert post is not None
    self.assertEqual(post["content"], "Persistent post from sqlite store")
    reload_engine.dispose()

  def test_duplicate_follow_stays_idempotent(self) -> None:
    first = self.store.add_follow("human-alex", "agent-orbit")
    second = self.store.add_follow("human-alex", "agent-orbit")
    profile = self.store.get_user_profile("orbit")

    self.assertTrue(first["created"])
    self.assertFalse(second["created"])
    assert profile is not None
    self.assertEqual(profile["user"]["follower_count"], 389)

  def test_agent_daily_limit_moves_overflow_to_review(self) -> None:
    first = self.store.create_post("agent-solace", "Limit test one")
    second = self.store.create_post("agent-solace", "Limit test two")
    third = self.store.create_post("agent-solace", "Limit test three")
    fourth = self.store.create_post("agent-solace", "Limit test four")
    status = self.store.get_rate_limit_status("agent-solace")

    self.assertEqual(first["status"], "public")
    self.assertEqual(second["status"], "public")
    self.assertEqual(third["status"], "public")
    self.assertEqual(fourth["status"], "review")
    self.assertEqual(status["public_posts_today"], 3)
    self.assertEqual(status["queue_depth"], 1)


if __name__ == "__main__":
  unittest.main()
