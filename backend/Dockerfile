# ── FraudOS FastAPI Backend — Dockerfile ──────────────────────
FROM python:3.12-slim AS base

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN useradd -m -u 1001 fraudos
WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source, and ML scripts
COPY app/ ./app/
COPY ai_data_agent.py .
COPY start.sh .

# Make start script executable
RUN chmod +x start.sh

# Switch to non-root
USER fraudos

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')"

CMD ["./start.sh"]
