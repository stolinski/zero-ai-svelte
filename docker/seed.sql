-- Chats table (no foreign key to users, client-side user_id instead)
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- Will be stored in client localStorage
  title TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_mode TEXT CHECK (share_mode IN ('read', 'write')),
  share_id TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Added user_id field
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Index for faster chat filtering
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Index for sharing
CREATE INDEX IF NOT EXISTS idx_chats_share_id ON chats(share_id);
CREATE INDEX IF NOT EXISTS idx_chats_is_shared ON chats(is_shared);

-- Index for the LIKE-based text filter
CREATE INDEX IF NOT EXISTS idx_chats_title_text ON chats(title);
CREATE INDEX IF NOT EXISTS idx_messages_content_text ON messages(content);