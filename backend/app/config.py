# backend/app/config.py — FraudOS Configuration
import os
from dotenv import load_dotenv

# Load .env file if present (local/docker-compose); on AKS env vars are injected directly
load_dotenv()

DB_CON_STR = os.getenv("DB_CON_STR")
DB_SCHEMA = os.getenv("DB_SCHEMA", "rahul")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
