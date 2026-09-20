# 🏗️ SIH 2026 Bee Bridge — System Architecture

Comprehensive architectural documentation for SIH Problem Statement 26021.

---

## 1. Multi-Tier Layered Architecture

```mermaid
flowchart TD
    subgraph Client [Presentation Layer - React 18 + Vite]
        UI1[E-Commerce Marketplace]
        UI2[Seller & Beekeeper Hub: /seller/batches]
        UI3[Public Verification: /verify/:batchId]
        UI4[AI Hive Monitoring: /sih/hive-monitoring]
        UI5[Order Receipt with Embedded QR]
    end

    subgraph AppServer [Application & API Gateway Layer]
        API1[POST /api/create-order]
        API2[POST /api/verify-payment]
        API3[POST /api/sih-register-beekeeper]
        API4[POST /api/sih-verify-farmer]
        API5[POST /api/sih/iot/telemetry]
    end

    subgraph DataStorage [Data & Consensus Layer]
        DB[(Supabase PostgreSQL with RLS)]
        BC[(Polygon Amoy Testnet - HoneyChain.sol)]
    end

    subgraph AIService [AI & Machine Learning Microservice]
        AI1[FastAPI Server - Port 8000]
        AI2[MobileNetV2 Transfer Learning Engine]
        AI3[metrics.json & Checkpoints]
    end

    Client -->|REST & RPC| AppServer
    AppServer --> DB
    AppServer -->|ethers.js| BC
    Client -->|Direct Public Query| DB
    UI4 -->|Multipart Image| AI1
    AI1 --> AI2
```

---

## 2. Security Boundaries & Zero-PII Policy

| Entity | Raw Value Location | On-Chain Stored Data | Security Measure |
| :--- | :--- | :--- | :--- |
| **Agriculture ID / Aadhaar** | Never stored in plaintext | SHA-256 Hash (`0x3f5b...`) | One-way hashing; impossible to reverse |
| **Beekeeper Phone / Email** | Protected by Supabase RLS | Excluded from Smart Contract | Accessible only to authenticated user |
| **Honey Batch Verification** | Off-Chain DB + On-Chain TX | Contract Batch Struct & Checkpoints | Canonical SHA-256 hash comparison |
| **Private Keys** | Server-side `.env` only | Never in git or client bundles | In `.gitignore` & serverless execution |

---

## 3. Data Integrity & Verification Protocol

When a customer visits `/verify/:batchId`, seven checks execute sequentially:
1. **Batch Code Regex:** Validates `^HB-\d{4}-\d{6}$`.
2. **Database Record Lookup:** Retrieves batch metadata from `sih_honey_batches`.
3. **Blockchain Confirmation:** Validates that transaction hash exists and has consensus on Polygon Amoy.
4. **Metadata Hash Check:** Recomputes `SHA-256(batchCode|hiveCode|variety|harvestDate|grade)` and verifies against recorded on-chain state.
5. **Farmer Proof:** Confirms farmer's Agriculture ID was verified by authorized authority.
6. **Hive Mapping:** Confirms hive ownership matches registered apiary.
7. **Certificate Rendering:** Displays certified authenticity shield or detailed failure reasons.
