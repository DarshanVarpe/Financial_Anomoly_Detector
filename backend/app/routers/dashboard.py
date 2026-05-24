# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends, Query
from app.db.pool import get_pool

router = APIRouter()


# ── GET /api/dashboard/kpis ──────────────────────────────────
@router.get("/kpis")
async def get_kpis(pool=Depends(get_pool)):
    try:
        row = await pool.fetchrow("""
            SELECT
                COUNT(*)                                                          AS total_transactions,
                COUNT(*) FILTER (WHERE status <> 'unreviewed')                   AS total_reviewed,
                COUNT(*) FILTER (WHERE status = 'fraud')                         AS confirmed_fraud,
                COUNT(*) FILTER (WHERE status = 'cleared')                       AS cleared_count,
                COUNT(*) FILTER (WHERE status = 'escalated')                     AS escalated_count,
                COUNT(*) FILTER (WHERE status = 'unreviewed')                    AS unreviewed_count,
                COUNT(*)                                                          AS total_flagged,
                ROUND(
                  100.0 * COUNT(*) FILTER (WHERE status = 'cleared') /
                  NULLIF(COUNT(*) FILTER (WHERE status <> 'unreviewed'), 0), 2
                )                                                                 AS fp_rate_pct
            FROM transactions
        """)
        return {"success": True, "data": dict(row)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/dashboard/chart/timeseries ─────────────────────
@router.get("/chart/timeseries")
async def get_timeseries(pool=Depends(get_pool)):
    try:
        rows = await pool.fetch("""
            SELECT
                TO_CHAR(DATE_TRUNC('hour', flagged_at), 'HH24:00') AS hour,
                COUNT(*)                                             AS flagged,
                COUNT(*) FILTER (WHERE status = 'fraud')            AS confirmed
            FROM transactions
            WHERE flagged_at >= NOW() - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', flagged_at)
            ORDER BY DATE_TRUNC('hour', flagged_at)
        """)
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/dashboard/chart/risk-distribution ──────────────
@router.get("/chart/risk-distribution")
async def get_risk_distribution(pool=Depends(get_pool)):
    try:
        row = await pool.fetchrow("""
            SELECT
                SUM(CASE WHEN ensemble_score >= 0.9                          THEN 1 ELSE 0 END) AS critical,
                SUM(CASE WHEN ensemble_score >= 0.8 AND ensemble_score < 0.9 THEN 1 ELSE 0 END) AS high,
                SUM(CASE WHEN ensemble_score >= 0.6 AND ensemble_score < 0.8 THEN 1 ELSE 0 END) AS medium,
                SUM(CASE WHEN ensemble_score < 0.6                           THEN 1 ELSE 0 END) AS low
            FROM transactions
        """)
        return {"success": True, "data": dict(row)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/dashboard/audit-log ────────────────────────────
@router.get("/audit-log")
async def get_audit_log(
    limit: int = Query(20, ge=1, le=100),
    pool=Depends(get_pool),
):
    try:
        rows = await pool.fetch(
            """
            SELECT id::text, transaction_ref, investigator_name,
                   action, ensemble_score, notes, decided_at
            FROM audit_log
            ORDER BY decided_at DESC
            LIMIT $1
            """,
            limit,
        )
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/dashboard/activity-log ─────────────────────────
@router.get("/activity-log")
async def get_activity_log(
    limit: int = Query(30, ge=1, le=100),
    pool=Depends(get_pool),
):
    try:
        rows = await pool.fetch(
            """
            SELECT id::text, event_type, description, source, created_at
            FROM activity_log
            ORDER BY created_at DESC
            LIMIT $1
            """,
            limit,
        )
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}
