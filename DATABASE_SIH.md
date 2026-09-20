# 🗄️ SIH 2026 — Supabase Database Schema

Complete documentation of all `sih_*` tables, indexes, and Row-Level Security (RLS) policies.

---

## 1. Tables Overview

All tables are prefixed with `sih_` to ensure zero collision with existing marketplace tables (`users`, `products`, `orders`, `sellers`).

```
sih_beekeepers (Beekeeper profiles & Agriculture ID hash)
      │
      ├──< sih_hives (Hive registry: HIVE-XXXXXX)
      │       │
      │       └──< sih_honey_batches (Batch registry: HB-YYYY-XXXXXX)
      │               │
      │               ├──< sih_trace_events (Supply-chain checkpoints)
      │               └──< sih_blockchain_records (On-chain TX mirrors)
      │
      ├──< sih_hive_scans (AI Vision disease detection scans)
      ├──< sih_hive_telemetry (IoT sensor temperature & humidity)
      ├──< sih_hive_alerts (Automated threshold alerts)
      └──< sih_productivity_predictions (Forecasted honey yields)
```

---

## 2. Table Specifications

### 1. `sih_beekeepers`
- `id` (UUID PK): Primary key
- `user_id` (UUID FK): References `auth.users(id)`
- `full_name`, `farm_name`, `farm_location`, `farm_state`, `farm_district`, `farm_pincode`
- `agriculture_id`: Display masked only (e.g. `AGRI-TN-••••-8921`)
- `agri_id_hash`: SHA-256 hash anchored to `HoneyChain.sol`
- `verification_status`: `'pending' | 'approved' | 'rejected'`
- `blockchain_address`: Beekeeper Ethereum wallet

### 2. `sih_hives`
- `id` (UUID PK)
- `beekeeper_id` (UUID FK): References `sih_beekeepers(id)`
- `hive_code` (TEXT UNIQUE): Sequential ID e.g. `HIVE-000001`
- `location_label`, `latitude`, `longitude`
- `species` (DEFAULT `'Apis cerana'`)
- `hive_type` (DEFAULT `'Langstroth'`)
- `blockchain_tx_hash`: TX hash from `registerHive()`

### 3. `sih_honey_batches`
- `id` (UUID PK)
- `hive_id` (UUID FK): References `sih_hives(id)`
- `beekeeper_id` (UUID FK): References `sih_beekeepers(id)`
- `batch_code` (TEXT UNIQUE): Sequential code e.g. `HB-2026-000001`
- `variety`, `extraction_date`, `quantity_kg`
- `purity_score`, `moisture_content`, `sugar_content`, `ph_level`, `quality_grade`
- `blockchain_tx_hash`: TX hash from `registerHoneyBatch()`
- `status`: `'harvested' | 'quality_checked' | 'packed' | 'listed' | 'sold' | 'delivered'`

### 4. `sih_trace_events`
- `id` (UUID PK)
- `batch_id` (UUID FK): References `sih_honey_batches(id)`
- `event_type`: `'Harvested' | 'Quality Checked' | 'Packed' | 'Listed' | 'Sold' | 'Delivered'`
- `event_label`, `location`, `actor_name`
- `blockchain_tx_hash`

### 5. `sih_hive_scans`
- `id` (UUID PK)
- `hive_code` (TEXT)
- `prediction`: `'Healthy' | 'Possible Varroa Risk' | 'Manual Inspection Recommended'`
- `confidence`: Decimal percentage (e.g. `96.4%`)
- `recommendation`: Beekeeper inspection instructions

### 6. `sih_hive_telemetry`
- `id` (UUID PK)
- `hive_code` (TEXT)
- `temperature_c`, `humidity_percent`, `battery_percent`
- `is_demo` (BOOLEAN): Flag for Demo Sensor Mode

### 7. `sih_hive_alerts`
- `id` (UUID PK)
- `hive_code` (TEXT)
- `alert_type`: `'Possible Varroa Risk' | 'High Temperature' | 'Low Temperature' | 'Low Humidity' | 'Sensor Offline' | 'Productivity Drop'`
- `severity`: `'info' | 'warning' | 'critical'`
- `is_resolved` (BOOLEAN)

---

## 3. Row Level Security (RLS) Summary

- **Public Read Access:** Enabled for `sih_honey_batches`, `sih_trace_events`, and `sih_blockchain_records` so consumers scanning QR codes at `/verify/:batchId` can verify authenticity without logging in.
- **Private Beekeeper Access:** Write access to `sih_hives` and `sih_honey_batches` strictly requires `auth.uid() = beekeeper.user_id` and `verification_status = 'approved'`.
