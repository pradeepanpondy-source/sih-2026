-- ============================================================
-- SIH 2026 - Module 3: AI Hive Monitoring & Disease Detection
-- Run this in Supabase SQL Editor
-- ALL tables are sih_ prefixed — ZERO changes to existing tables
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- Table 1: sih_hive_scans
-- AI image analysis scans for Varroa mite & colony health
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_hive_scans (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hive_id               UUID REFERENCES sih_hives(id) ON DELETE CASCADE,
    hive_code             TEXT NOT NULL,                     -- e.g. HIVE-000001
    image_url             TEXT,                              -- Stored in Supabase or base64 preview
    image_name            TEXT,
    prediction            TEXT NOT NULL CHECK (prediction IN ('Healthy', 'Possible Varroa Risk', 'Manual Inspection Recommended')),
    confidence            DECIMAL(5,2) NOT NULL,             -- 0.00 – 100.00%
    is_risk_detected      BOOLEAN DEFAULT FALSE,
    recommendation        TEXT NOT NULL,
    model_version         TEXT DEFAULT 'mobilenetv2-varroa-v1.0',
    inference_time_ms     INTEGER DEFAULT 85,
    features_detected     JSONB,                             -- mites_count, wing_deformity_score, etc.
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_hive_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_hive_scans_public_read" ON sih_hive_scans;
CREATE POLICY "sih_hive_scans_public_read" ON sih_hive_scans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_hive_scans_insert_any" ON sih_hive_scans;
CREATE POLICY "sih_hive_scans_insert_any" ON sih_hive_scans
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sih_hive_scans_hive_code ON sih_hive_scans(hive_code);
CREATE INDEX IF NOT EXISTS idx_sih_hive_scans_created_at ON sih_hive_scans(created_at DESC);


-- ──────────────────────────────────────────────────────────────
-- Table 2: sih_hive_telemetry
-- IoT sensor environmental telemetry (Temp, Humidity, Battery)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_hive_telemetry (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hive_id               UUID REFERENCES sih_hives(id) ON DELETE CASCADE,
    hive_code             TEXT NOT NULL,                     -- e.g. HIVE-000001
    temperature_c         DECIMAL(4,2) NOT NULL,             -- e.g. 34.50 °C
    humidity_percent      DECIMAL(4,2) NOT NULL,             -- e.g. 62.00 %
    battery_percent       DECIMAL(4,2) NOT NULL DEFAULT 100.00,
    signal_strength_dbm   INTEGER DEFAULT -65,
    is_demo               BOOLEAN DEFAULT FALSE,             -- Demo Sensor Mode flag
    recorded_at           TIMESTAMPTZ DEFAULT NOW(),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_hive_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_hive_telemetry_public_read" ON sih_hive_telemetry;
CREATE POLICY "sih_hive_telemetry_public_read" ON sih_hive_telemetry
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_hive_telemetry_insert_any" ON sih_hive_telemetry;
CREATE POLICY "sih_hive_telemetry_insert_any" ON sih_hive_telemetry
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sih_hive_telemetry_code ON sih_hive_telemetry(hive_code, recorded_at DESC);


-- ──────────────────────────────────────────────────────────────
-- Table 3: sih_hive_alerts
-- Automated alerts triggered by AI vision or IoT threshold breaches
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_hive_alerts (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hive_id               UUID REFERENCES sih_hives(id) ON DELETE CASCADE,
    hive_code             TEXT NOT NULL,
    alert_type            TEXT NOT NULL CHECK (alert_type IN (
                            'Possible Varroa Risk',
                            'High Temperature',
                            'Low Temperature',
                            'Low Humidity',
                            'Sensor Offline',
                            'Productivity Drop'
                          )),
    severity              TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title                 TEXT NOT NULL,
    description           TEXT NOT NULL,
    threshold_value       TEXT,                              -- e.g. "39.2°C (Limit: 38°C)"
    is_resolved           BOOLEAN DEFAULT FALSE,
    resolved_at           TIMESTAMPTZ,
    resolution_notes      TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_hive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_hive_alerts_public_read" ON sih_hive_alerts;
CREATE POLICY "sih_hive_alerts_public_read" ON sih_hive_alerts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_hive_alerts_insert_any" ON sih_hive_alerts;
CREATE POLICY "sih_hive_alerts_insert_any" ON sih_hive_alerts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sih_hive_alerts_update_any" ON sih_hive_alerts;
CREATE POLICY "sih_hive_alerts_update_any" ON sih_hive_alerts
    FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_sih_hive_alerts_code ON sih_hive_alerts(hive_code, is_resolved);


-- ──────────────────────────────────────────────────────────────
-- Table 4: sih_productivity_predictions
-- AI-estimated honey yield and production trends
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sih_productivity_predictions (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hive_id               UUID REFERENCES sih_hives(id) ON DELETE CASCADE,
    hive_code             TEXT NOT NULL,
    estimated_yield_kg    DECIMAL(5,2) NOT NULL,
    trend_direction       TEXT CHECK (trend_direction IN ('increasing', 'stable', 'decreasing')),
    confidence_score      DECIMAL(5,2) DEFAULT 88.50,
    factors               JSONB,                             -- { "temp_factor": 1.05, "health_factor": 0.95 }
    prediction_window     TEXT DEFAULT 'Next 30 Days',
    is_prototype          BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sih_productivity_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sih_productivity_public_read" ON sih_productivity_predictions;
CREATE POLICY "sih_productivity_public_read" ON sih_productivity_predictions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sih_productivity_insert_any" ON sih_productivity_predictions;
CREATE POLICY "sih_productivity_insert_any" ON sih_productivity_predictions
    FOR INSERT WITH CHECK (true);
