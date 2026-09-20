# 📱 SIH 2026 — QR Verification & Traceability Guide

Documentation for QR Code generation, sticker label printing, and customer verification.

---

## 1. QR Code Specifications

- **Target URL Pattern:** `https://<domain>/verify/<batchCode>` (e.g. `https://beebridge.vercel.app/verify/HB-2026-000001`)
- **Payload Rules:** Strictly encodes the verification URL. **Never** encodes raw personal information, Aadhaar numbers, or user tokens.
- **Error Correction Level:** Level `H` (High: ~30% damage recovery) allowing labels to remain readable even if scratched or honey-stained.
- **Supported Formats:**
  - **PNG:** High-resolution 300-512px raster image.
  - **SVG:** Scalable vector format for commercial label printing.
  - **Print Layout:** Formatted 4x4 inch printable honey jar label with QR, Batch ID, Hive ID, and Harvest details.

---

## 2. Verification Workflow for Consumers

```
+-------------------------------------------------------------+
| Customer scans QR on honey jar with smartphone camera       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Browser opens /verify/HB-2026-000001 (NO login required)    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 7-Step Cryptographic Validation Engine executes             |
| 1. Batch ID Format Verification                             |
| 2. HoneyChain Registry Lookup                               |
| 3. Polygon Amoy Blockchain Confirmation                     |
| 4. SHA-256 Metadata Tamper Detection                        |
| 5. Beekeeper Agriculture ID Cryptographic Proof             |
| 6. Hive Geolocation & Apiary Mapping                        |
| 7. Quality Lab Parameters Check (Purity, Moisture, Sugar, pH)|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Success Screen: "Bee Bridge Honey Authenticity"             |
| Verified Honey Checkmark + Interactive Traceability Journey |
+-------------------------------------------------------------+
```

---

## 3. Order Receipt Integration

Order receipts rendered in `OrderReceipt.tsx` automatically embed:
- **Honey Batch ID:** `HB-2026-000001`
- **Dynamic QR Code:** Live rendering of `/verify/:batchId`
- **Customer instructions:** *"Scan to verify authenticity on the blockchain."*
- Fully styled for web viewing and A4 PDF printing.
