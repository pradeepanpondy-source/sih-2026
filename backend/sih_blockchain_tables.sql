-- ============================================================
-- SIH 2026 - Blockchain Honey Chain Tables
-- Run this in Supabase SQL Editor
-- ALL tables are sih_ prefixed — ZERO changes to existing tables
-- Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS patterns)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- Table 1: sih_beekeepers
-- Beekeeper profiles with Agriculture ID verification
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_beekeepers (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id             UUID REFERENCES sellers(id) ON DELETE SET NULL,
    -- Beekeeper info
    full_name             TEXT NOT NULL,
    phone                 TEXT,
    farm_name             TEXT,
    farm_location         TEXT,
    farm_state            TEXT,
    farm_district         TEXT,
    farm_pincode          TEXT,
    farm_latitude         DECIMAL(10,8),
    farm_longitude        DECIMAL(11,8),
    experience_years      INTEGER DEFAULT 0,
    -- Agriculture ID Verification
    agriculture_id        TEXT,                              -- Encrypted/masked display only
    agri_id_hash          TEXT,                              -- SHA-256 hash stored in blockchain
    verification_status   TEXT DEFAULT 'pending'
                          CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_at           TIMESTAMPTZ,
    rejected_reason       TEXT,
    -- Blockchain
    blockchain_tx_hash    TEXT,                              -- TX hash from verifyFarmer()
    blockchain_address    TEXT,                              -- Ethereum wallet address used on-chain
    -- Metadata
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure one beekeeper profile per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sih_beekeepers_user_id
    ON sih_beekeepers(user_id);

-- Enable RLS
ALTER TABLE sih_beekeepers ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "sih_beekeepers_select_own" ON sih_beekeepers;
CREATE POLICY "sih_beekeepers_select_own" ON sih_beekeepers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sih_beekeepers_insert_own" ON sih_beekeepers;
CREATE POLICY "sih_beekeepers_insert_own" ON sih_beekeepers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sih_beekeepers_update_own" ON sih_beekeepers;
CREATE POLICY "sih_beekeepers_update_own" ON sih_beekeepers
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access (for API verification workflow)
-- Note: service_role bypasses RLS by default in Supabase

CREATE INDEX IF NOT EXISTS idx_sih_beekeepers_seller_id ON sih_beekeepers(seller_id);
CREATE INDEX IF NOT EXISTS idx_sih_beekeepers_status ON sih_beekeepers(verification_status);


-- ──────────────────────────────────────────────────────────────
-- Table 2: sih_hives
-- Individual beehive registry with unique HIVE-XXXXXX codes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_hives (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    beekeeper_id          UUID NOT NULL REFERENCES sih_beekeepers(id) ON DELETE CASCADE,
    -- Unique sequential code generated server-side
    hive_code             TEXT NOT NULL,                     -- HIVE-000001
    hive_name             TEXT,                              -- Optional friendly name
    -- Location
    location_label        TEXT,                              -- Human readable address
    latitude              DECIMAL(10,8),
    longitude             DECIMAL(11,8),
    -- Hive details
    species               TEXT DEFAULT 'Apis cerana',        -- Default Indian bee species
    hive_type             TEXT DEFAULT 'Langstroth',         -- Langstroth, Top-bar, Warre, Log hive
    frame_count           INTEGER DEFAULT 10,
    install_date          DATE,
    is_active             BOOLEAN DEFAULT TRUE,
    -- Blockchain
    blockchain_hive_id    BIGINT,                            -- uint256 from smart contract
    blockchain_tx_hash    TEXT,                              -- TX hash from registerHive()
    -- QR
    qr_code_url           TEXT,                              -- Stored in Supabase Storage
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sih_hives_code
    ON sih_hives(hive_code);

ALTER TABLE sih_hives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_hives_select_own" ON sih_hives;
CREATE POLICY "sih_hives_select_own" ON sih_hives
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_hives.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "sih_hives_insert_own" ON sih_hives;
CREATE POLICY "sih_hives_insert_own" ON sih_hives
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_hives.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
            AND sih_beekeepers.verification_status = 'approved'
        )
    );

DROP POLICY IF EXISTS "sih_hives_update_own" ON sih_hives;
CREATE POLICY "sih_hives_update_own" ON sih_hives
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_hives.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_sih_hives_beekeeper_id ON sih_hives(beekeeper_id);


-- ──────────────────────────────────────────────────────────────
-- Table 3: sih_honey_batches
-- Honey batch registry with unique HB-YYYY-XXXXXX codes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_honey_batches (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hive_id               UUID NOT NULL REFERENCES sih_hives(id) ON DELETE CASCADE,
    beekeeper_id          UUID NOT NULL REFERENCES sih_beekeepers(id) ON DELETE CASCADE,
    -- Unique sequential code generated server-side
    batch_code            TEXT NOT NULL,                     -- HB-2026-000001
    -- Honey details
    variety               TEXT,                              -- Wild Forest, Jamun, Tulsi, Mustard
    extraction_date       DATE,
    quantity_kg           DECIMAL(8,3),
    purity_score          DECIMAL(5,2),                      -- 0.00 – 100.00
    moisture_content      DECIMAL(5,2),                      -- percentage
    sugar_content         DECIMAL(5,2),
    ph_level              DECIMAL(4,2),
    quality_grade         TEXT CHECK (quality_grade IN ('A', 'B', 'C', 'Rejected')),
    lab_report_url        TEXT,
    -- Marketplace link
    product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
    -- Status
    status                TEXT DEFAULT 'harvested'
                          CHECK (status IN ('harvested', 'quality_checked', 'packed', 'listed', 'sold', 'delivered')),
    -- Blockchain
    blockchain_batch_id   BIGINT,                            -- uint256 from smart contract
    blockchain_tx_hash    TEXT,                              -- TX hash from registerHoneyBatch()
    -- QR for consumer scanning
    qr_code_url           TEXT,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sih_honey_batches_code
    ON sih_honey_batches(batch_code);

ALTER TABLE sih_honey_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_honey_batches_select_own" ON sih_honey_batches;
CREATE POLICY "sih_honey_batches_select_own" ON sih_honey_batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_honey_batches.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
        )
    );

-- Public read for QR scan consumer page (any batch can be scanned)
DROP POLICY IF EXISTS "sih_honey_batches_public_read" ON sih_honey_batches;
CREATE POLICY "sih_honey_batches_public_read" ON sih_honey_batches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_honey_batches_insert_own" ON sih_honey_batches;
CREATE POLICY "sih_honey_batches_insert_own" ON sih_honey_batches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_honey_batches.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
            AND sih_beekeepers.verification_status = 'approved'
        )
    );

DROP POLICY IF EXISTS "sih_honey_batches_update_own" ON sih_honey_batches;
CREATE POLICY "sih_honey_batches_update_own" ON sih_honey_batches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sih_beekeepers
            WHERE sih_beekeepers.id = sih_honey_batches.beekeeper_id
            AND sih_beekeepers.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_sih_honey_batches_hive ON sih_honey_batches(hive_id);
CREATE INDEX IF NOT EXISTS idx_sih_honey_batches_beekeeper ON sih_honey_batches(beekeeper_id);
CREATE INDEX IF NOT EXISTS idx_sih_honey_batches_status ON sih_honey_batches(status);


-- ──────────────────────────────────────────────────────────────
-- Table 4: sih_trace_events
-- Immutable trace events per batch (mirrors blockchain events)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_trace_events (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id         UUID NOT NULL REFERENCES sih_honey_batches(id) ON DELETE CASCADE,
    -- Event details
    event_type       TEXT NOT NULL
                     CHECK (event_type IN ('Harvested', 'Quality Checked', 'Packed', 'Listed', 'Sold', 'Delivered')),
    event_label      TEXT NOT NULL,
    description      TEXT,
    location         TEXT,
    actor_name       TEXT,                                   -- Display name of who performed action
    -- Blockchain record
    blockchain_tx_hash TEXT,                                 -- TX hash from addTraceEvent()
    -- Timestamps
    event_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_trace_events ENABLE ROW LEVEL SECURITY;

-- Public read — consumers need to see trace events without login
DROP POLICY IF EXISTS "sih_trace_events_public_read" ON sih_trace_events;
CREATE POLICY "sih_trace_events_public_read" ON sih_trace_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_trace_events_insert_own" ON sih_trace_events;
CREATE POLICY "sih_trace_events_insert_own" ON sih_trace_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sih_honey_batches
            JOIN sih_beekeepers ON sih_beekeepers.id = sih_honey_batches.beekeeper_id
            WHERE sih_honey_batches.id = sih_trace_events.batch_id
            AND sih_beekeepers.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_sih_trace_events_batch ON sih_trace_events(batch_id, event_date);


-- ──────────────────────────────────────────────────────────────
-- Table 5: sih_blockchain_records
-- Mirrors on-chain transactions for quick off-chain queries
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_blockchain_records (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- References
    beekeeper_id     UUID REFERENCES sih_beekeepers(id) ON DELETE SET NULL,
    hive_id          UUID REFERENCES sih_hives(id) ON DELETE SET NULL,
    batch_id         UUID REFERENCES sih_honey_batches(id) ON DELETE SET NULL,
    -- Record type
    record_type      TEXT NOT NULL
                     CHECK (record_type IN ('farmer_verified', 'hive_registered', 'batch_registered', 'trace_event')),
    -- Blockchain data
    tx_hash          TEXT NOT NULL,                          -- Ethereum transaction hash
    block_number     BIGINT,
    contract_address TEXT,                                   -- HoneyChain contract address
    network          TEXT DEFAULT 'polygon-amoy',
    gas_used         BIGINT,
    -- Data snapshot
    data_summary     TEXT,                                   -- Human readable summary
    raw_receipt      JSONB,                                  -- Full transaction receipt (optional)
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_blockchain_records ENABLE ROW LEVEL SECURITY;

-- Public read — blockchain records are inherently public
DROP POLICY IF EXISTS "sih_blockchain_records_public_read" ON sih_blockchain_records;
CREATE POLICY "sih_blockchain_records_public_read" ON sih_blockchain_records
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_blockchain_records_insert_authenticated" ON sih_blockchain_records;
CREATE POLICY "sih_blockchain_records_insert_authenticated" ON sih_blockchain_records
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_sih_blockchain_records_tx ON sih_blockchain_records(tx_hash);
CREATE INDEX IF NOT EXISTS idx_sih_blockchain_records_batch ON sih_blockchain_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_sih_blockchain_records_beekeeper ON sih_blockchain_records(beekeeper_id);


-- ──────────────────────────────────────────────────────────────
-- Sequence functions for generating unique codes
-- ──────────────────────────────────────────────────────────────

-- Generate next HIVE code: HIVE-000001, HIVE-000002, ...
CREATE OR REPLACE FUNCTION generate_hive_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    seq INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM sih_hives;
    RETURN 'HIVE-' || LPAD(seq::TEXT, 6, '0');
END;
$$;

-- Generate next Batch code: HB-2026-000001, HB-2026-000002, ...
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
    seq INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM sih_honey_batches;
    RETURN 'HB-' || year_str || '-' || LPAD(seq::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- ✅ Migration complete. Run this in Supabase SQL Editor.
-- ============================================================
