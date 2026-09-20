# SIH 2026 — Bee Bridge HoneyChain & AI Analytics
## Comprehensive Technical Stack & Architecture Specification (PPT Ready)

---

## 1. Executive Summary & Problem Statement
* **Problem Statement ID:** 26021
* **Project Name:** Bee Bridge HoneyChain
* **Core Solution:** Decentralized Honey Traceability, Zero-PII Farmer Verification on Polygon Blockchain, AI-Powered Bee Disease (Varroa Mite) Screening, and IoT Hive Environmental Monitoring.

---

## 2. Overall Tech Stack Architecture Overview

| Layer | Technologies Used | Key Purpose / Role |
|---|---|---|
| **Blockchain Core** | Solidity `^0.8.24`, OpenZeppelin Contracts (v5), Hardhat, Polygon Amoy Testnet (Chain ID 80002) | Decentralized immutable ledger for beekeepers, hives, honey batches, and quality audit trails. |
| **Blockchain Client / Web3** | `ethers.js v6.13`, RPC Node Gateway (Polygon Amoy), Etherscan/Polygonscan API | Smart contract interactions, SHA-256 hash anchoring, event logging. |
| **AI Vision & Deep Learning** | Python 3.10+, TensorFlow 2.15+, Keras, MobileNetV2 Transfer Learning, Scikit-learn, OpenCV, Pillow | Image classification for Bee Colony Health and Varroa Mite risk screening with confidence scoring. |
| **AI Microservice API** | FastAPI, Uvicorn, Pydantic, NumPy | Asynchronous REST microservice exposing `/predict`, `/metrics`, `/health`, and `/telemetry`. |
| **IoT Environmental Telemetry** | Simulated IoT Microcontroller Payload, REST Ingestion Engine, Alert Evaluator | Real-time brood temperature, relative humidity, and battery voltage tracking with safety thresholds. |
| **Frontend Framework** | React 18, Vite 7, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons | Responsive high-performance web application with rich aesthetics, glassmorphism, and dynamic charts. |
| **QR & Export Engine** | `qrcode` (SVG & PNG engines), `jspdf`, `jspdf-autotable`, `html2canvas` | Instant vector/raster QR code rendering, 4x4-inch printable jar labels, and cryptographic receipts. |
| **Backend & Serverless API** | Node.js 22, Vercel Serverless Functions (`@vercel/node`), Express 5 (Local dev proxy) | Unified API gateway, payment webhooks, verification router, and transactional mailer. |
| **Database & Auth** | Supabase (PostgreSQL 15), Row Level Security (RLS), Supabase Auth (PKCE flow) | Relational persistence for user accounts, seller records, batch registry, telemetry logs, and audit trails. |
| **Security & Privacy** | SHA-256 Hashing (`crypto` / Web Crypto API), Zero-Knowledge PII Architecture | Agriculture ID hashing before storage; zero raw Aadhaar or govt ID ever touches the blockchain or database. |

---

## 3. Blockchain Module — Deep Dive

### 3.1 Smart Contract: `HoneyChain.sol`
* **Language & Compiler:** Solidity `0.8.24` with `viaIR` optimizer (200 runs).
* **Base Libraries:** OpenZeppelin `Ownable`, `ReentrancyGuard`.
* **Deployment Network:** Polygon Amoy Testnet (Chain ID `80002`).
* **Contract Architecture:**
  1. `verifyFarmer(address farmerAddress, bytes32 agriIdHash, string farmerName)`
     - Binds a cryptographic hash of the government Agriculture ID to the farmer's on-chain wallet.
  2. `registerHive(string hiveCode, string location, string hiveType)`
     - Mints unique hive identifiers (`HIVE-000001`) tied exclusively to verified beekeepers.
  3. `registerBatch(string batchCode, string hiveCode, string variety, string harvestDate, string qualityGrade, bytes32 metadataHash)`
     - Anchors batch metadata, lab grades, and SHA-256 canonical hash to the immutable ledger.
  4. `addTraceEvent(string batchCode, string location, string eventType, string details)`
     - Records supply-chain milestones (Harvesting &rarr; Lab Testing &rarr; Packaging &rarr; Retail).
  5. `verifyBatch(string batchCode)` *(View)*
     - Public zero-gas verification returning on-chain validity, timestamp, farmer address, and metadata hash.

### 3.2 Privacy & Security Architecture
* **Zero-PII Storage:** Raw Agriculture IDs are hashed via `SHA-256` server-side:
  $$\text{Hash} = \text{SHA-256}(\text{UPPERCASE}(\text{AgricultureID}))$$
* Only the 32-byte hash `0x...` is broadcasted on-chain.
* The frontend masks display numbers: `****-****-1234`.

---

## 4. AI Analytics & Hive Disease Screening — Deep Dive

### 4.1 Neural Network Model Architecture
* **Base Model:** MobileNetV2 (Pretrained on ImageNet).
* **Custom Classification Head:**
  - `GlobalAveragePooling2D()`
  - `Dense(128, activation='relu')`
  - `Dropout(0.3)`
  - `Dense(64, activation='relu')`
  - `Dropout(0.2)`
  - `Dense(1, activation='sigmoid')` (Binary Classification: Healthy vs. Varroa Mite Risk)
* **Optimization:** Adam Optimizer ($\text{lr} = 0.0001$), Binary Crossentropy loss.
* **Input Resolution:** $224 \times 224 \times 3$ RGB normalized to $[0, 1]$.

### 4.2 Training & Evaluation Metrics
* **Accuracy:** 100% on test partition
* **Precision:** 1.0000
* **Recall:** 1.0000
* **F1-Score:** 1.0000
* **Confusion Matrix:** $\begin{bmatrix} 44 & 0 \\ 0 & 31 \end{bmatrix}$ (44 Healthy True Negatives, 31 Varroa True Positives, 0 False Positives/Negatives).
* **Inference Speed:** $\approx 45\text{ms}$ per image.
* **Low Confidence Safety Rule:** If model prediction confidence is between $40\%$ and $65\%$, output displays: *"Manual Inspection Recommended (Inconclusive)"* to avoid false guarantees.

### 4.3 IoT Environmental Monitoring Subsystem
* **Telemetry Parameters Tracked:**
  - **Brood Nest Temperature ($T$):** Healthy range $32.0^\circ\text{C} - 36.0^\circ\text{C}$ (Alert triggered if $> 38.0^\circ\text{C}$ or $< 31.0^\circ\text{C}$).
  - **Internal Relative Humidity ($RH$):** Healthy range $50.0\% - 70.0\%$ (Alert triggered if $< 45.0\%$).
  - **IoT Node Battery ($V$):** Healthy $> 20\%$ (Low power alert triggered if $< 20\%$).
* **Colony Health Index Formula:**
  $$\text{Health Index} = 100 - (\text{Temp Penalty} + \text{Humidity Penalty} + \text{AI Disease Penalty})$$

---

## 5. QR Code & Consumer Verification Architecture

### 5.1 Verification Workflow (7-Step Cryptographic Check)
1. **Format Validation:** RegEx check on `HB-YYYY-XXXXXX`.
2. **Registry Lookup:** Fetch canonical batch record from PostgreSQL registry.
3. **Beekeeper Status Check:** Verify `is_verified_farmer == true`.
4. **On-Chain Query:** Validate transaction receipt and block timestamp on Polygon Amoy.
5. **Metadata Hash Integrity:** Compute browser-side SHA-256 hash and compare against blockchain `bytes32 metadataHash`.
6. **Lab Quality Check:** Confirm FSSAI/AGMARK purity $\ge 95\%$, moisture $\le 20\%$, pH $3.4-4.5$.
7. **Traceability Timeline Assembly:** Construct unalterable supply-chain journey.

### 5.2 Label Engine
* High-resolution dynamic QR Code generation with error correction level `H` (30% redundancy).
* Export options: Scalable Vector Graphics (SVG), 500x500 PNG, and standard 4x4-inch adhesive jar printable labels.

---

## 6. Slide-by-Slide PPT Content Recommendation

* **Slide 1: Title & Vision:** Bee Bridge HoneyChain — Smart Agriculture & Traceability Ecosystem.
* **Slide 2: Problem & Solution:** Combating Honey Adulteration & Colony Collapse with Blockchain + AI.
* **Slide 3: System Architecture:** Full-stack workflow from Hive $\to$ Blockchain $\to$ AI Lab $\to$ Consumer Scan.
* **Slide 4: Module 1 — Polygon Blockchain:** `HoneyChain.sol`, Zero-PII Agriculture ID verification, immutable harvest batches.
* **Slide 5: Module 2 — QR Verification:** Consumer verification page (`/verify/:id`), 7-step trust shield, jar label printing.
* **Slide 6: Module 3 — AI Vision & IoT:** MobileNetV2 Varroa screening (100% test score), 24h IoT brood sensors & alerts.
* **Slide 7: Tech Stack Matrix:** Summary table of all tools (Solidity, Ethers.js, MobileNetV2, FastAPI, React, Supabase).
* **Slide 8: Live Demo & Future Scope:** Live walkthrough script, scaling to Polygon Mainnet & hardware edge devices.
