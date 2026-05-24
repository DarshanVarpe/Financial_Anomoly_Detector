# backend/app/db/pool.py — Aiven PostgreSQL async connection pool
import asyncpg
import ssl
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import DB_CON_STR, DB_SCHEMA

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised.")
    return _pool


def _make_ssl_ctx() -> ssl.SSLContext:
    """Build an SSL context that trusts Aiven's self-signed CA."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE   # Aiven uses self-signed certs
    return ctx


def _parse_libpq_dsn(dsn: str) -> dict:
    """Parse libpq key=value connection string into asyncpg keyword args.

    Handles quoted values (e.g. password='abc!@#') by stripping surrounding
    single or double quotes that libpq format allows for special characters.
    """
    params = {}
    # Regex-based split to handle quoted values containing spaces
    import re
    tokens = re.findall(r"(\w+)=('[^']*'|\"[^\"]*\"|\S+)", dsn)
    for key, value in tokens:
        # Strip surrounding quotes added for libpq special-char escaping
        if (value.startswith("'") and value.endswith("'")) or \
           (value.startswith('"') and value.endswith('"')):
            value = value[1:-1]
        params[key] = value
    return {
        "host": params.get("host"),
        "port": int(params["port"]) if "port" in params else 5432,
        "user": params.get("user"),
        "password": params.get("password"),
        "database": params.get("dbname", params.get("database")),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool

    use_ssl = os.getenv("AIVEN_SSL", "true").lower() == "true"
    ssl_ctx = _make_ssl_ctx() if use_ssl else None

    print(f"Connecting via DB_CON_STR (ssl={use_ssl})")

    conn_kwargs = _parse_libpq_dsn(DB_CON_STR)

    _pool = await asyncpg.create_pool(
        **conn_kwargs,
        ssl=ssl_ctx,
        min_size=1,
        max_size=5,
        command_timeout=30,
        statement_cache_size=0,   # required for Aiven PgBouncer proxy
        server_settings={'search_path': f'{DB_SCHEMA}, public'}
    )
    print("Aiven PostgreSQL pool ready")
    yield
    await _pool.close()
    print("Aiven PostgreSQL pool closed")
