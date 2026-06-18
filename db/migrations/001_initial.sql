-- BluAgent initial schema

CREATE TABLE IF NOT EXISTS chronicle_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keeper_id             INTEGER NOT NULL,
  donor_id              INTEGER NOT NULL,
  new_stage             INTEGER NOT NULL,
  tx_hash               TEXT NOT NULL UNIQUE,
  block_number          BIGINT NOT NULL,
  merged_at             TIMESTAMPTZ NOT NULL,
  -- selection mode (future BluChallenge; defaults to deterministic for v1)
  selection_mode        TEXT NOT NULL DEFAULT 'deterministic',
  keeper_selected_by    TEXT NOT NULL DEFAULT 'holder',
  survivor_selected_by  TEXT NOT NULL DEFAULT 'holder',
  holder_override       BOOLEAN NOT NULL DEFAULT FALSE,
  -- AI-generated fields (written async by enrich-merge job)
  donor_echo            TEXT,
  chapter               TEXT,
  stat_snapshot         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chronicle_keeper_idx ON chronicle_events (keeper_id);
CREATE INDEX IF NOT EXISTS chronicle_donor_idx ON chronicle_events (donor_id);
CREATE INDEX IF NOT EXISTS chronicle_merged_at_idx ON chronicle_events (merged_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ownership_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id              INTEGER NOT NULL,
  from_address          TEXT,                   -- NULL = mint
  to_address            TEXT NOT NULL,
  tx_hash               TEXT NOT NULL,
  block_number          BIGINT NOT NULL,
  transferred_at        TIMESTAMPTZ NOT NULL,
  sale_price_eth        NUMERIC(20, 8),         -- from Reservoir, NULL if non-sale transfer
  listing_price_eth     NUMERIC(20, 8),         -- ask price before sale if available
  ens_from              TEXT,                   -- resolved ENS for from_address (cached)
  ens_to                TEXT,                   -- resolved ENS for to_address (cached)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, token_id)
);

CREATE INDEX IF NOT EXISTS ownership_token_idx ON ownership_events (token_id, transferred_at ASC);
CREATE INDEX IF NOT EXISTS ownership_to_idx ON ownership_events (to_address);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_state (
  token_id              INTEGER PRIMARY KEY,
  vibe_id               INTEGER,
  stage                 INTEGER NOT NULL,
  system_prompt         TEXT,                   -- current compiled prompt snapshot
  display_name          TEXT,                   -- holder-set (T4 only)
  bio_override          TEXT,                   -- holder-set (T4 only)
  offers_public         BOOLEAN NOT NULL DEFAULT TRUE,
  scarcity_snapshot     JSONB,                  -- nightly: {stageCount, lineageVibeCount, ...}
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS indexer_state (
  key                   TEXT PRIMARY KEY,
  value                 TEXT NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks last processed block for each indexer
INSERT INTO indexer_state (key, value) VALUES
  ('merge_indexer_last_block', '0'),
  ('ownership_indexer_last_block', '0')
ON CONFLICT (key) DO NOTHING;
