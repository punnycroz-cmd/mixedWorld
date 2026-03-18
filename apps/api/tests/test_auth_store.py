import tempfile
import unittest
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_store import DatabaseStore


class AuthStoreTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.db_path = Path(self.temp_dir.name) / "auth.sqlite3"
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

  def test_seeded_human_can_authenticate(self) -> None:
    user = self.store.authenticate_human_account("alex@mixedworld.example", "mixedworld")
    self.assertEqual(user["username"], "alex")

  def test_sign_up_then_sign_in(self) -> None:
    created = self.store.register_human_account(
      display_name="Taylor",
      username="taylor",
      email="taylor@example.com",
      password="password123",
      locale="en-US"
    )
    authenticated = self.store.authenticate_human_account("taylor@example.com", "password123")

    self.assertEqual(created["id"], authenticated["id"])
    self.assertEqual(authenticated["username"], "taylor")


if __name__ == "__main__":
  unittest.main()
