-- Create ENUMs
CREATE TYPE enum_channels_type AS ENUM ('facebook', 'instagram', 'whatsapp');
CREATE TYPE enum_channels_status AS ENUM ('active', 'disconnected');
CREATE TYPE enum_conversations_status AS ENUM ('open', 'pending', 'closed', 'snoozed');
CREATE TYPE enum_messages_sender_type AS ENUM ('customer', 'agent', 'bot');
CREATE TYPE enum_messages_message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'template');
CREATE TYPE enum_messages_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- 1. user
CREATE TABLE "user" (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL,
  image        TEXT,
  "isAdmin"    BOOLEAN NOT NULL,
  contact      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

-- 2. channels
CREATE TABLE channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                enum_channels_type NOT NULL,
  name                VARCHAR(255) NOT NULL,
  external_account_id VARCHAR(255) NOT NULL,
  access_token        TEXT,
  webhook_verify_token VARCHAR(255),
  status              enum_channels_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL
);

-- 3. customers
CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255),
  email      VARCHAR(255),
  phone      VARCHAR(255),
  avatar_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- 4. customer_channel_identities
CREATE TABLE customer_channel_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id       UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  external_user_id VARCHAR(255) NOT NULL,
  raw_profile      JSONB,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_channel_external_user ON customer_channel_identities(channel_id, external_user_id);

-- 5. conversations
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id       UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  assigned_agent_id TEXT,
  status           enum_conversations_status NOT NULL DEFAULT 'open',
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);

-- 6. messages
CREATE TABLE messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type        enum_messages_sender_type NOT NULL,
  sender_id          UUID,
  external_message_id VARCHAR(255),
  content            TEXT,
  message_type       enum_messages_message_type NOT NULL DEFAULT 'text',
  media_url          VARCHAR(255),
  status             enum_messages_status NOT NULL DEFAULT 'sent',
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ NOT NULL
);

-- 7. webhook_events
CREATE TABLE webhook_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  payload    JSONB NOT NULL,
  processed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL
);
