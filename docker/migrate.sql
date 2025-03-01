-- First, backup the data (optional but recommended)
CREATE TABLE IF NOT EXISTS chats_backup AS SELECT * FROM chats;
CREATE TABLE IF NOT EXISTS messages_backup AS SELECT * FROM messages;

-- Alter the chats table
ALTER TABLE chats 
ALTER COLUMN created_at TYPE BIGINT USING extract(epoch from created_at) * 1000,
ALTER COLUMN updated_at TYPE BIGINT USING extract(epoch from updated_at) * 1000;

-- Alter the messages table
ALTER TABLE messages
ALTER COLUMN created_at TYPE BIGINT USING extract(epoch from created_at) * 1000,
ALTER COLUMN updated_at TYPE BIGINT USING extract(epoch from updated_at) * 1000;

-- If the conversion fails and you need to restore from backup:
-- DROP TABLE chats;
-- DROP TABLE messages;
-- ALTER TABLE chats_backup RENAME TO chats;
-- ALTER TABLE messages_backup RENAME TO messages; 