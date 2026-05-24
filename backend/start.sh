#!/bin/bash
# Start the AI Data Agent in the background
python -u ai_data_agent.py &

# Start the FastAPI Uvicorn server in the foreground
exec uvicorn app.main:app --host 0.0.0.0 --port 5000
