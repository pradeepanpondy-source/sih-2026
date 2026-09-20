# 🎤 SIH 2026 — 5-Minute Pitch & Demonstration Script

A step-by-step live presentation guide for showcasing the Bee Bridge Honey Chain & AI Monitoring system to SIH judges.

---

## ⏱️ Presentation Timeline (Total: 5 Minutes)

| Time | Stage | Screen / Route | Key Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:30** | **Problem Statement** | Slide / Home Page | Explain honey adulteration, lack of farm traceability, and colony loss from Varroa mites. |
| **0:30 - 1:00** | **1. Beekeeper Verification** | `/seller/batches` → Tab 3 | Show Agriculture ID SHA-256 on-chain proof. Zero PII stored. "Verified Beekeeper ✓". |
| **1:00 - 1:30** | **2. Hive Registration** | `/seller/batches` → Tab 2 | Show unique `HIVE-000001` sequential IDs mapped to verified beekeepers with GPS apiary. |
| **1:30 - 2:10** | **3. Honey Batch & Blockchain** | `/seller/batches` → Tab 1 | Show batch `HB-2026-000001`, click **"View Blockchain"** to show Polygon Amoy consensus TX. |
| **2:10 - 2:50** | **4. QR Generation & Label** | `/seller/batches` → **View QR** | Click **"View QR"**, demonstrate **Download PNG**, **Download SVG**, and **Print Jar Label**. |
| **2:50 - 3:30** | **5. Public Customer Scan** | `/verify/HB-2026-000001` | Open in new tab (no login). Show 7-step cryptographic check, lab metrics (purity, moisture), and journey. |
| **3:30 - 4:10** | **6. AI Disease Detection** | `/sih/hive-monitoring` → Tab 1 | Click **"Sample 2: Varroa Infested"**, show real-time MobileNetV2 detection (89.4% confidence) & advice. |
| **4:10 - 4:35** | **7. Colony Health Dashboard** | `/sih/hive-monitoring` → Tab 2 | Show 30-day Health Index curve, 24h temp/humidity telemetry, and Honey Productivity Forecast. |
| **4:35 - 4:55** | **8. IoT Telemetry & Alerts** | `/sih/hive-monitoring` → Tab 3 | Show **Demo Sensor Mode**, click **"Simulate 39.4°C Spike"** → instant critical alert triggered! |
| **4:55 - 5:00** | **Conclusion & Impact** | Order Receipt | Show customer receipt with QR code: pure honey, verified farmers, secured on Polygon. |

---

## 📋 Step-by-Step Live Demo Execution

### Step 1: Beekeeper Verification & Privacy
1. Navigate to: `http://localhost:5174/seller/batches`
2. Click tab: **"🛡️ Beekeeper Agriculture ID Proof"**
3. **Say:** *"Notice our privacy-first design. We never store Aadhaar or raw Agriculture IDs on the blockchain. Instead, we store a one-way SHA-256 cryptographic hash on our Polygon Amoy smart contract."*

### Step 2: Hive Registration
1. Click tab: **"🐝 Registered Hives"**
2. **Say:** *"Each hive receives a server-generated sequential ID like `HIVE-000001`. Each hive belongs strictly to one verified farmer with recorded apiary coordinates."*

### Step 3: Honey Batch Creation & Polygon Blockchain
1. Click tab: **"🍯 Honey Batches & QR Codes"**
2. Point out batch `HB-2026-000001` (Variety: Raw Multifloral Forest Honey).
3. Click button: **"View Blockchain"** → Opens Polygonscan Amoy explorer showing transaction hash and confirmed block.

### Step 4: QR Generation & Printing
1. Click button: **"View QR"** on batch `HB-2026-000001`.
2. Show modal with instant high-resolution QR.
3. Click **"Print Label"** to show printable 4x4-inch sticker label formatted for honey jars.

### Step 5: Public Customer Verification (No Login)
1. In an incognito window or direct tab, open: `http://localhost:5174/verify/HB-2026-000001`
2. **Say:** *"Notice no customer login is required. The system validates the batch ID, compares the SHA-256 metadata hash against the on-chain consensus, verifies the farmer proof, and displays the certified authenticity shield."*
3. Show failure scenarios: Change URL to `/verify/HB-2026-INVALID` or `/verify/HB-2026-TAMPERED` to demonstrate the instant **"Verification Failed"** tamper alert!

### Step 6: AI Vision Disease Screening
1. Navigate to: `http://localhost:5174/sih/hive-monitoring`
2. Under **AI Image Screening**, click **"Sample 2: Varroa Infested"**.
3. **Say:** *"Our fine-tuned MobileNetV2 transfer learning model detects the reddish-brown mite patches and wing deformities in 68ms with 89.4% confidence."*
4. Click **"Sample 3: Glare / Low Conf"** to demonstrate our safety guardrail: when confidence is below 75%, it alerts: *"Manual Inspection Recommended"*.

### Step 7: Colony Health & Productivity Analytics
1. Click tab: **"Colony Health Analytics"**.
2. Point out:
   - **Hive Health Index Trend:** Colony vigor over past 30 days.
   - **Estimated Honey Productivity Trend:** AI-driven forecast labeled *"Prototype Prediction"*.

### Step 8: IoT Environmental Telemetry & Demo Mode
1. Click tab: **"IoT Environmental Telemetry"**.
2. Note the live gauges (Temperature, Humidity, Battery, LoRaWAN signal).
3. Click button: **"Simulate 39.4°C Spike"**.
4. Switch to **"Alerts & Notifications"** tab to show the critical heat alert generated in real-time.

### Step 9: Order Receipt Integration
1. View customer order receipt showing the embedded Honey Batch ID, high-res QR code, and *"Scan to verify authenticity on the blockchain."*
