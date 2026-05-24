# backend/app/main.py — FraudOS FastAPI entry point
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import asyncio
import redis.asyncio as redis
from contextlib import asynccontextmanager

from app.config import CORS_ORIGIN
from app.db.pool import lifespan as db_lifespan
from app.routers import dashboard, transactions, model, reports

limiter = Limiter(key_func=get_remote_address)

# --- WebSocket & Redis Manager ---
active_connections = []


async def redis_listener():
    try:
        r = redis.Redis(host='localhost', port=6379, db=0)
        pubsub = r.pubsub()
        await pubsub.subscribe('fraud_alerts')
        print("🎧 Subscribed to Redis channel: fraud_alerts")
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data'].decode('utf-8')
                # Broadcast to all connected clients
                dead_conns = []
                for connection in active_connections:
                    try:
                        await connection.send_text(data)
                    except Exception:
                        dead_conns.append(connection)
                for c in dead_conns:
                    active_connections.remove(c)
    except Exception as e:
        print(f"Redis Listener Error: {e}")

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    # Start Redis Listener background task
    task = asyncio.create_task(redis_listener())
    # Start DB pool
    async with db_lifespan(app):
        yield
    task.cancel()

# --- App Definition ---
app = FastAPI(
    title="FraudOS API",
    description="AI-Powered Fraud Detection — FraudOS Platform",
    version="2.0.0",
    lifespan=app_lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "*"] if CORS_ORIGIN == "*" else [CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(dashboard.router,    prefix="/api/dashboard",     tags=["dashboard"])
app.include_router(transactions.router, prefix="/api/transactions",  tags=["transactions"])
app.include_router(model.router,        prefix="/api/model",         tags=["model"])
app.include_router(reports.router,      prefix="/api/reports",       tags=["reports"])

# ── WebSockets ────────────────────────────────────────────────
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Just keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# ── Health ────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
async def health():
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "service": "FraudOS API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
