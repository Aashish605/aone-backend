-- Create ENUMs (DO block to handle IF NOT EXISTS since PostgreSQL doesn't support it for CREATE TYPE)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_channels_type') THEN CREATE TYPE enum_channels_type AS ENUM ('facebook', 'instagram', 'whatsapp'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_channels_status') THEN CREATE TYPE enum_channels_status AS ENUM ('active', 'disconnected'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_conversations_status') THEN CREATE TYPE enum_conversations_status AS ENUM ('open', 'pending', 'closed', 'snoozed'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_messages_sender_type') THEN CREATE TYPE enum_messages_sender_type AS ENUM ('customer', 'agent', 'bot'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_messages_message_type') THEN CREATE TYPE enum_messages_message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'template'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_messages_status') THEN CREATE TYPE enum_messages_status AS ENUM ('sent', 'delivered', 'read', 'failed'); END IF; END $$;

  -- 1. user
  CREATE TABLE IF NOT EXISTS "user" (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL,
    image        TEXT,
    "isAdmin"    BOOLEAN NOT NULL,
    contact      TEXT,
    "createdAt"  TIMESTAMPTZ NOT NULL,
    "updatedAt"  TIMESTAMPTZ NOT NULL
  );

  -- 2. channels
  CREATE TABLE IF NOT EXISTS channels (
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
  CREATE TABLE IF NOT EXISTS customers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255),
    email      VARCHAR(255),
    phone      VARCHAR(255),
    avatar_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );

  -- 4. customer_channel_identities
  CREATE TABLE IF NOT EXISTS customer_channel_identities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel_id       UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,
    raw_profile      JSONB,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_external_user ON customer_channel_identities(channel_id, external_user_id);

  -- 5. conversations
  CREATE TABLE IF NOT EXISTS conversations (
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
  CREATE TABLE IF NOT EXISTS messages (
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
  CREATE TABLE IF NOT EXISTS webhook_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    payload    JSONB NOT NULL,
    processed  BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL
  );

  -- 8. better-auth: session
  CREATE TABLE IF NOT EXISTS session (
    id        TEXT PRIMARY KEY,
    expiresAt TIMESTAMPTZ NOT NULL,
    token     TEXT NOT NULL UNIQUE,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);

  -- 9. better-auth: account
  CREATE TABLE IF NOT EXISTS account (
    id                    TEXT PRIMARY KEY,
    accountId             TEXT NOT NULL,
    providerId            TEXT NOT NULL,
    userId                TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    accessToken           TEXT,
    refreshToken          TEXT,
    idToken               TEXT,
    accessTokenExpiresAt  TIMESTAMPTZ,
    refreshTokenExpiresAt TIMESTAMPTZ,
    scope                 TEXT,
    password              TEXT,
    createdAt             TIMESTAMPTZ NOT NULL,
    updatedAt             TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);

  -- 10. better-auth: verification
  CREATE TABLE IF NOT EXISTS verification (
    id         TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value      TEXT NOT NULL,
    expiresAt  TIMESTAMPTZ NOT NULL,
    createdAt  TIMESTAMPTZ NOT NULL,
    updatedAt  TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
