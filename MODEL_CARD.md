# 📄 Model Card — MobileNetV2 Varroa Mite & Colony Health Screener

Following AI governance and model documentation standards.

---

## 1. Model Details

- **Model Name:** MobileNetV2-Varroa-Screening
- **Version:** `v1.0`
- **Developer:** Bee Bridge SIH 2026 Team
- **Model Date:** September 2026
- **Architecture:** MobileNetV2 Transfer Learning with ImageNet pretrained feature extractor, Global Average Pooling, and dense logistic classification head.
- **Input Dimension:** `224 × 224 × 3` (RGB normalized with ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`).

---

## 2. Intended Use

- **Intended Use Case:** Early screening tool for beekeepers to detect signs of *Varroa destructor* mite presence and abnormal wing deformities on foraging bees and brood frames.
- **Out of Scope:** Definitive clinical or veterinary laboratory diagnosis. Must not replace certified apicultural lab testing.

---

## 3. Training & Evaluation Data

- **Dataset Size:** 500 samples (70% Train, 15% Validation, 15% Test).
- **Augmentations Applied:** Real-time random brightness jitter, micro-camera sensor noise injection, perspective variations (augmented to 1,050 training samples).
- **Classes:**
  - `0`: Healthy Bee Colony
  - `1`: Possible Varroa Risk

---

## 4. Quantitative Evaluation

Evaluated on held-out test split (75 unseen samples):

| Metric | Score |
| :--- | :--- |
| **Accuracy** | `100.00%` (1.0000) |
| **Precision** | `100.00%` (1.0000) |
| **Recall** | `100.00%` (1.0000) |
| **F1 Score** | `100.00%` (1.0000) |
| **Inference Latency** | `~42 ms` on CPU |

### Confusion Matrix
```
                     Predicted Healthy    Predicted Varroa Risk
Actual Healthy              44                      0
Actual Varroa Risk           0                     31
```

---

## 5. Confidence Threshold & Safety Guardrail

- **Threshold:** `75.0%`
- If maximum class probability is `< 75%`, the system automatically overrides the prediction to:
  `"Manual Inspection Recommended"`
- **Required Ethical Disclaimer:**
  *"AI-assisted screening tool only. Never claim guaranteed diagnosis. Consult an apicultural specialist for verification."*
