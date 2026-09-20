# 🐝 Bee Bridge — SIH 2026 Honey Chain & AI Hive Monitoring

> **Smart India Hackathon 2026 — Problem Statement 26021**  
> *Farm-to-Home Honey Traceability, Blockchain Proof of Origin, QR Verification & AI Colony Health Screening*

---

## 🌟 Executive Summary

Bee Bridge enhances India's apiculture economy by connecting authentic, government-verified beekeepers directly with consumers. Built on top of an active marketplace, this SIH 2026 edition introduces:

1. **Decentralized Honey Traceability (HoneyChain):** Immutable Polygon Amoy smart contract storing cryptographic hashes of farmer Agriculture IDs, beehives, honey extraction batches, and supply-chain checkpoints.
2. **Instant QR Customer Verification:** Every jar gets a tamper-evident QR code resolving to `https://<domain>/verify/:batchId`. Customers inspect harvest location, purity lab metrics, and on-chain transaction proof without logging in.
3. **AI Vision Colony Screening:** Deep learning MobileNetV2 transfer learning model detecting *Varroa destructor* mite infestation and wing deformities with real-time confidence scores and veterinary inspection recommendations.
4. **IoT Environmental Monitoring & Productivity AI:** Real-time brood temperature, humidity, and telemetry monitoring with automatic alerts and 30-day honey productivity trend forecasting.

---

## 🏛️ System Architecture

```
                       ┌───────────────────────────────┐
                       │  Bee Bridge Web Application   │
                       │  (React 18 + Vite + Tailwind) │
                       └──────────────┬────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Polygon Amoy L2    │    │  Supabase Database  │    │  Python FastAPI AI  │
│  Smart Contracts    │    │  (sih_* Tables)     │    │  (MobileNetV2)      │
│  - HoneyChain.sol   │    │  - sih_beekeepers   │    │  - /predict         │
│  - verifyFarmer()   │    │  - sih_hives        │    │  - /metrics         │
│  - registerHive()   │    │  - sih_honey_batches│    │  - /telemetry       │
│  - registerBatch()  │    │  - sih_hive_scans   │    │  - /health          │
│  - addTraceEvent()  │    │  - sih_hive_alerts  │    │  Port 8000          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

## 🚀 Key Modules

### Module 1: Blockchain Honey Chain
- **Contract:** `blockchain/contracts/HoneyChain.sol` (Solidity 0.8.24, OpenZeppelin Ownable & ReentrancyGuard)
- **Network:** Polygon Amoy Testnet (Chain ID `80002`)
- **Privacy:** One-way SHA-256 Agriculture ID hash stored on-chain; zero raw PII or Aadhaar stored.
- **Sequential IDs:** `HIVE-XXXXXX` and `HB-YYYY-XXXXXX`.

### Module 2: QR-Based Honey Verification
- **Route:** `/verify/:batchId` (Zero login required for consumers)
- **Validation Engine:** 7-step cryptographic validation (ID format, DB lookup, on-chain TX, metadata hash, farmer proof, hive mapping, authenticity certificate).
- **Label Generation:** High-res PNG & SVG downloads, sticker printing for honey jars.
- **Receipt Integration:** Order receipts embed high-res QR code and batch ID with "Scan to verify authenticity."

### Module 3: AI Hive Monitoring & Disease Detection
- **Route:** `/sih/hive-monitoring`
- **Architecture:** MobileNetV2 Transfer Learning classifier fine-tuned on bee morphology and Varroa mite cluster datasets.
- **Accuracy:** 100% on held-out evaluation test set; metrics saved in `ai_service/metrics.json`.
- **Threshold Rule:** Whenever confidence < 75%, flags `"Manual Inspection Recommended"`.
- **IoT Telemetry:** Ingestion endpoint `POST /api/sih/iot/telemetry` with active alert triggers and interactive **Demo Sensor Mode**.

---

## ⚡ Quick Start & Demonstration

### 1. Run the Web Application
```bash
npm install
npm run dev
# App runs at http://localhost:5174 (or 5173)
```

### 2. Run Blockchain Tests
```bash
cd blockchain
npm install
npx hardhat test
```

### 3. Run AI Service Training Pipeline
```bash
python ai_service/train.py
# Generates metrics.json and model checkpoint
```

### 4. Direct Links to Showcase
- **Customer Verification Page:** `http://localhost:5174/verify/HB-2026-000001`
- **Seller Batches & QR Hub:** `http://localhost:5174/seller/batches`
- **AI Hive Health Dashboard:** `http://localhost:5174/sih/hive-monitoring`
