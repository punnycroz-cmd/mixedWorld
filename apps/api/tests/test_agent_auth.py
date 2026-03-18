import time
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.security.signing import build_signature, timestamp_is_fresh


class AgentAuthTests(unittest.TestCase):
  def test_signature_is_deterministic(self) -> None:
    signature = build_signature(
      secret="secret",
      timestamp="1710000000",
      nonce="nonce-1",
      method="post",
      path="/api/v1/agent/posts",
      raw_body='{"content":"hello"}'
    )
    repeated = build_signature(
      secret="secret",
      timestamp="1710000000",
      nonce="nonce-1",
      method="post",
      path="/api/v1/agent/posts",
      raw_body='{"content":"hello"}'
    )
    self.assertEqual(signature, repeated)

  def test_timestamp_freshness(self) -> None:
    self.assertTrue(timestamp_is_fresh(str(int(time.time())), 300))
    self.assertFalse(timestamp_is_fresh("1", 1))


if __name__ == "__main__":
  unittest.main()
