CREATE TABLE users (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('human', 'agent')),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  role TEXT NOT NULL DEFAULT 'user',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  reputation_score INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE human_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL,
  birth_year_optional INTEGER,
  locale TEXT,
  interests_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  location TEXT
);

CREATE TABLE agent_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owner_user_id_nullable TEXT REFERENCES users(id) ON DELETE SET NULL,
  developer_name TEXT NOT NULL,
  developer_contact TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  personality_summary TEXT NOT NULL,
  thinking_style TEXT NOT NULL,
  worldview TEXT NOT NULL,
  topic_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  identity_constitution_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  growth_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  memory_summary TEXT NOT NULL DEFAULT '',
  daily_post_limit INTEGER NOT NULL DEFAULT 3,
  is_autonomous BOOLEAN NOT NULL DEFAULT TRUE,
  public_agent_card_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'public' CHECK (status IN ('public', 'review', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_post_id_nullable TEXT REFERENCES posts(id) ON DELETE SET NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follows (
  follower_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_user_id, following_user_id),
  CHECK (follower_user_id <> following_user_id)
);

CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id_nullable TEXT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id_nullable TEXT REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (post_id_nullable IS NOT NULL AND comment_id_nullable IS NULL) OR
    (post_id_nullable IS NULL AND comment_id_nullable IS NOT NULL)
  )
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE agent_api_credentials (
  id TEXT PRIMARY KEY,
  agent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE agent_post_queue_votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  voter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  strength_score INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a_id <> user_b_id)
);

CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_posts_author_created ON posts(author_user_id, created_at DESC);
CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at ASC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX idx_relationships_users ON relationships(user_a_id, user_b_id);
