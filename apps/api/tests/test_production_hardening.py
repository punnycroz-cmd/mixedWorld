import os
import tempfile
import unittest
from pathlib import Path
import sys
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.security.session_tokens import issue_session_token, verify_session_token
from app.services.database_store import DatabaseStore


class SessionTokenTests(unittest.TestCase):
  def test_round_trip(self) -> None:
    token = issue_session_token("user-1", "developer", "human", secret="s3cret", ttl_seconds=60)
    claims = verify_session_token(token, secret="s3cret")
    self.assertIsNotNone(claims)
    self.assertEqual(claims.user_id, "user-1")
    self.assertEqual(claims.role, "developer")
    self.assertEqual(claims.account_type, "human")

  def test_wrong_secret_rejected(self) -> None:
    token = issue_session_token("user-1", "user", "human", secret="s3cret", ttl_seconds=60)
    self.assertIsNone(verify_session_token(token, secret="other-secret"))

  def test_tampered_payload_rejected(self) -> None:
    token = issue_session_token("user-1", "user", "human", secret="s3cret", ttl_seconds=60)
    payload, signature = token.split(".")
    tampered = f"{payload[:-1]}x.{signature}"
    self.assertIsNone(verify_session_token(tampered, secret="s3cret"))

  def test_expired_rejected(self) -> None:
    token = issue_session_token("user-1", "user", "human", secret="s3cret", ttl_seconds=-10)
    self.assertIsNone(verify_session_token(token, secret="s3cret"))

  def test_malformed_rejected(self) -> None:
    self.assertIsNone(verify_session_token("not-a-token", secret="s3cret"))


class EntitlementTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.db_path = Path(self.temp_dir.name) / "entitlements.sqlite3"
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
    with patch.dict(os.environ, {"FREE_MAX_AGENTS": "1", "PRO_MAX_AGENTS": "3"}):
      self.store = DatabaseStore(self.engine, self.session_factory)
      self.store.initialize()

  def tearDown(self) -> None:
    self.engine.dispose()
    self.temp_dir.cleanup()

  def _make_owner(self) -> dict:
    return self.store.register_human_account(
      display_name="Plan Tester",
      username="plantester",
      email="plantester@example.com",
      password="password123"
    )

  def _agent_payload(self, username: str) -> dict:
    return {
      "username": username,
      "display_name": username.title(),
      "bio": "test agent",
      "developer_name": "tester",
      "developer_contact": "tester@example.com",
      "model_provider": "openrouter",
      "model_name": "test-model",
      "personality_summary": "calm",
      "thinking_style": "reflective",
      "worldview": "friendly",
      "topic_interests": ["testing"],
      "core_values": ["honesty"],
      "growth_policy": "steady",
      "is_autonomous": False
    }

  def test_free_plan_agent_cap(self) -> None:
    owner = self._make_owner()
    self.store.register_agent_for_owner(owner["id"], self._agent_payload("agent-one"))
    with self.assertRaisesRegex(ValueError, "plan allows 1 agent"):
      self.store.register_agent_for_owner(owner["id"], self._agent_payload("agent-two"))

  def test_pro_plan_higher_cap(self) -> None:
    owner = self._make_owner()
    self.store.link_stripe_customer(owner["id"], "cus_test123")
    self.assertTrue(self.store.set_plan_by_stripe_customer("cus_test123", "pro"))

    for index in range(3):
      self.store.register_agent_for_owner(owner["id"], self._agent_payload(f"agent-{index}"))
    with self.assertRaisesRegex(ValueError, "plan allows 3 agents"):
      self.store.register_agent_for_owner(owner["id"], self._agent_payload("agent-overflow"))

  def test_billing_context_round_trip(self) -> None:
    owner = self._make_owner()
    context = self.store.get_billing_context(owner["id"])
    self.assertEqual(context["plan"], "free")
    self.assertIsNone(context["stripe_customer_id"])

    self.store.link_stripe_customer(owner["id"], "cus_abc")
    context = self.store.get_billing_context(owner["id"])
    self.assertEqual(context["stripe_customer_id"], "cus_abc")

  def test_notification_read_markers(self) -> None:
    owner = self._make_owner()
    with patch.dict(os.environ, {"FREE_MAX_AGENTS": "5"}):
      agent = self.store.register_agent_for_owner(owner["id"], self._agent_payload("agent-notify"))

    # A comment on the owner's post by the agent notifies the owner.
    post = self.store.create_post(owner["id"], "hello world", visibility="public")
    self.store.create_comment(post["id"], agent["agent_user_id"], "nice post")

    notifications = self.store.list_notifications(owner["id"])
    self.assertTrue(any(not entry["is_read"] for entry in notifications))

    self.store.mark_all_notifications_read(owner["id"])
    notifications = self.store.list_notifications(owner["id"])
    self.assertTrue(all(entry["is_read"] for entry in notifications))


if __name__ == "__main__":
  unittest.main()
