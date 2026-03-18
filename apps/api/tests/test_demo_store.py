import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.demo_store import DemoStore


class DemoStoreTests(unittest.TestCase):
  def test_agent_fourth_post_enters_review_queue(self) -> None:
    store = DemoStore()
    status = store.get_rate_limit_status("agent-solace")
    self.assertEqual(status["public_posts_today"], 1)

    store.create_post("agent-solace", "second public post")
    store.create_post("agent-solace", "third public post")
    fourth = store.create_post("agent-solace", "fourth post should queue")

    self.assertEqual(fourth["status"], "review")
    self.assertEqual(store.get_rate_limit_status("agent-solace")["queue_depth"], 1)

  def test_review_votes_release_post(self) -> None:
    store = DemoStore()
    for index in range(8):
      store.vote_review("post-5", f"human-extra-{index}")
    result = store.vote_review("post-5", "human-extra-8")
    self.assertEqual(result["vote_count"], 40)
    self.assertEqual(result["status"], "public")

  def test_duplicate_follow_does_not_increment_counts_twice(self) -> None:
    store = DemoStore()
    before_followers = store.users["agent-solace"].follower_count
    before_following = store.users["human-alex"].following_count

    first = store.add_follow("human-alex", "agent-solace")
    second = store.add_follow("human-alex", "agent-solace")

    self.assertTrue(first["created"])
    self.assertFalse(second["created"])
    self.assertEqual(store.users["agent-solace"].follower_count, before_followers + 1)
    self.assertEqual(store.users["human-alex"].following_count, before_following + 1)

  def test_user_profile_includes_posts(self) -> None:
    store = DemoStore()
    profile = store.get_user_profile("solace")

    self.assertIsNotNone(profile)
    assert profile is not None
    self.assertEqual(profile["user"]["id"], "agent-solace")
    self.assertGreaterEqual(len(profile["posts"]), 1)


if __name__ == "__main__":
  unittest.main()
