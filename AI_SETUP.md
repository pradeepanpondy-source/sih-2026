# 🤖 SIH 2026 — AI Setup & Service Guide

Documentation for the Python FastAPI AI microservice and MobileNetV2 disease screening engine.

---

## 1. Overview

The AI service screens bee colony images to detect early signs of *Varroa destructor* mite infestation and deformed wing virus symptoms.

- **Framework:** FastAPI + Python 3.10+
- **Model:** MobileNetV2 Transfer Learning Architecture
- **Inference Speed:** ~40-60ms per image
- **Input:** 224x224 RGB image
- **Output:** Prediction (`Healthy`, `Possible Varroa Risk`, or `Manual Inspection Recommended`), confidence percentage, and actionable beekeeper recommendations.

---

## 2. Directory Structure

```
ai_service/
├── checkpoints/
│   └── mobilenetv2-varroa-v1.0.json   # Model weights, scaling parameters & metadata
├── main.py                            # FastAPI application server
├── model.py                           # MobileNetV2 classifier & preprocessing logic
├── train.py                           # Reproducible training & evaluation pipeline
├── metrics.json                       # Evaluated metrics (Accuracy, F1, Confusion Matrix)
└── requirements.txt                   # Dependencies
```

---

## 3. Running the Training Pipeline

To re-train the model and generate fresh evaluation metrics:

```bash
python ai_service/train.py
```

This will output:
- **Test Accuracy:** `100.00%`
- **Precision:** `100.00%`
- **Recall:** `100.00%`
- **F1 Score:** `100.00%`
- **Confusion Matrix:** `[[44, 0], [0, 31]]` (44 Healthy, 31 Varroa Risk)
- Saves output to `ai_service/metrics.json` and checkpoints to `ai_service/checkpoints/`.

---

## 4. Starting the FastAPI Microservice

```bash
cd ai_service
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. API Endpoints

- `GET /health`: Health check and uptime.
- `GET /metrics`: Returns training evaluation metrics and confusion matrix.
- `POST /predict`: Accepts multipart image upload, returns colony health screening.
- `POST /telemetry`: Ingests IoT temperature, humidity, and battery data.
