# FraudOS: Real-Time Financial Anomaly Detector
**Financial Anomaly Detection Project**

FraudOS (FraudOS Platform) is a production-grade, real-time fraud detection and investigation platform built for modern banking operations. It is designed specifically to address the challenge of detecting suspicious transactions and mule accounts in real-time.

## Architecture & Workflow

1. **AI Data Generation & ML Scoring:** A simulated data agent injects realistic financial transactions. An ensemble ML model (Isolation Forest + LSTM simulation) instantly scores every transaction for risk.
2. **Real-Time Streaming:** High-risk transactions are pushed to the frontend in milliseconds using a Redis Pub/Sub WebSocket pipeline.
3. **Agentic Investigation:** Investigators can interact with a Gemini 2.5 Flash-powered Copilot that explains exactly *why* a transaction was flagged using natural language.
4. **Instant Action:** The platform supports one-click, optimistic UI agentic workflows to Freeze, Escalate, or Confirm fraud.

## Key Features
- **Real-time Pipeline:** Sub-second anomaly detection with live dashboard toasts.
- **Explainable AI (XAI):** "One-Click Explain" generates a context-aware analysis of the anomaly.
- **Graceful Degradation:** Built-in intelligent fallback responses to handle API rate limits during demos.
- **Optimistic UI:** Instant visual feedback when taking action on a flagged transaction.

## How to Run Locally

### 1. Backend (FastAPI + ML + Redis)
Ensure Redis is installed and running on your machine.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start.sh
```
The AI Data Agent will start automatically and begin generating transactions.

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
