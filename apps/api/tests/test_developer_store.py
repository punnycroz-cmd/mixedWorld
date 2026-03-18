import tempfile
import unittest
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.database_store import DatabaseStore


class DeveloperStoreTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.db_path = Path(self.temp_dir.name) / "developer.sqlite3"
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

  def test_seeded_roles_are_backfilled(self) -> None:
    alex = self.store.get_user_detail("human-alex")
    mira = self.store.get_user_detail("human-mira")

    self.assertEqual(alex["role"], "developer")
    self.assertEqual(mira["role"], "admin")

  def test_register_agent_promotes_owner_and_scopes_dashboard(self) -> None:
    owner = self.store.register_human_account(
      display_name="Taylor Reed",
      username="taylorreed",
      email="taylorreed@example.com",
      password="password123"
    )
    other = self.store.register_human_account(
      display_name="Casey Hart",
      username="caseyhart",
      email="caseyhart@example.com",
      password="password123"
    )

    created = self.store.register_agent_for_owner(
      owner_user_id=owner["id"],
      payload={
        "username": "lumen",
        "display_name": "Lumen",
        "bio": "Tracks how mixed publics build memory.",
        "developer_name": "Taylor Reed",
        "developer_contact": "taylorreed@example.com",
        "model_provider": "OpenAI-compatible",
        "model_name": "gpt-social-1",
        "personality_summary": "Measured and observant.",
        "thinking_style": "Analytical",
        "worldview": "Public memory helps groups improve.",
        "topic_interests": ["memory", "governance"],
        "core_values": ["clarity", "consent"],
        "growth_policy": "Grow through repeated interactions.",
        "is_autonomous": True
      }
    )

    owner_after = self.store.get_user_detail(owner["id"])
    owner_dashboard = self.store.list_developer_dashboard(owner["id"])
    other_dashboard = self.store.list_developer_dashboard(other["id"])

    self.assertEqual(owner_after["role"], "developer")
    self.assertEqual(len(owner_dashboard), 1)
    self.assertEqual(owner_dashboard[0]["agent"]["id"], created["agent_user_id"])
    self.assertEqual(other_dashboard, [])

  def test_rotate_credentials_revokes_previous_key(self) -> None:
    created = self.store.register_agent_for_owner(
      owner_user_id="human-alex",
      payload={
        "username": "signalpath",
        "display_name": "SignalPath",
        "bio": "Maps emerging trust patterns.",
        "developer_name": "Alex Rowan",
        "developer_contact": "alex@mixedworld.example",
        "model_provider": "OpenAI-compatible",
        "model_name": "gpt-social-1",
        "personality_summary": "Calm and structural.",
        "thinking_style": "Systems-oriented",
        "worldview": "Behavior should be legible.",
        "topic_interests": ["trust", "moderation"],
        "core_values": ["clarity"],
        "growth_policy": "Adapt to relationship history.",
        "is_autonomous": True
      }
    )

    rotated = self.store.rotate_agent_credentials("human-alex", created["agent_user_id"])

    self.assertNotEqual(created["api_key"], rotated["api_key"])
    self.assertIsNone(self.store.lookup_agent_by_key(created["api_key"]))
    self.assertIsNotNone(self.store.lookup_agent_by_key(rotated["api_key"]))

  def test_owner_can_patch_agent_profile(self) -> None:
    created = self.store.register_agent_for_owner(
      owner_user_id="human-alex",
      payload={
        "username": "patchable",
        "display_name": "Patchable",
        "bio": "Initial bio.",
        "developer_name": "Alex Rowan",
        "developer_contact": "alex@mixedworld.example",
        "model_provider": "OpenAI-compatible",
        "model_name": "gpt-social-1",
        "personality_summary": "Initial personality.",
        "thinking_style": "Initial style",
        "worldview": "Initial worldview.",
        "topic_interests": ["memory"],
        "core_values": ["clarity"],
        "growth_policy": "Grow carefully.",
        "is_autonomous": True
      }
    )

    updated = self.store.patch_agent_profile_for_owner(
      owner_user_id="human-alex",
      agent_user_id=created["agent_user_id"],
      updates={
        "display_name": "Patchable Prime",
        "bio": "Updated bio.",
        "thinking_style": "Deliberate and comparative",
        "topic_interests": ["memory", "governance"],
        "growth_note": "Learning from repeated interactions.",
        "is_autonomous": False
      }
    )

    self.assertEqual(updated["display_name"], "Patchable Prime")
    self.assertEqual(updated["bio"], "Updated bio.")
    self.assertEqual(updated["thinking_style"], "Deliberate and comparative")
    self.assertEqual(updated["interests"], ["memory", "governance"])
    self.assertEqual(updated["growth_note"], "Learning from repeated interactions.")
    self.assertFalse(updated["is_autonomous"])

  def test_non_owner_cannot_patch_agent_profile(self) -> None:
    created = self.store.register_agent_for_owner(
      owner_user_id="human-alex",
      payload={
        "username": "guardedagent",
        "display_name": "Guarded Agent",
        "bio": "Protected profile.",
        "developer_name": "Alex Rowan",
        "developer_contact": "alex@mixedworld.example",
        "model_provider": "OpenAI-compatible",
        "model_name": "gpt-social-1",
        "personality_summary": "Guarded.",
        "thinking_style": "Careful",
        "worldview": "Boundaries matter.",
        "topic_interests": ["trust"],
        "core_values": ["consent"],
        "growth_policy": "Grow slowly.",
        "is_autonomous": True
      }
    )

    with self.assertRaises(PermissionError):
      self.store.patch_agent_profile_for_owner(
        owner_user_id="human-mira",
        agent_user_id=created["agent_user_id"],
        updates={"bio": "Attempted takeover."}
      )


if __name__ == "__main__":
  unittest.main()
