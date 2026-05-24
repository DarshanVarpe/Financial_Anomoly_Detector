# backend/app/routers/model.py
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.pool import get_pool

router = APIRouter()

DEFAULT_INV_ID = os.getenv(
    "DEFAULT_INVESTIGATOR_ID", "11111111-0000-0000-0000-000000000001"
)


# ── GET /api/model/metrics ───────────────────────────────────
@router.get("/metrics")
async def get_metrics(pool=Depends(get_pool)):
    try:
        rows = await pool.fetch("SELECT * FROM vw_latest_metrics ORDER BY model_name")
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/model/fp-trend ─────────────────────────────────
@router.get("/fp-trend")
async def get_fp_trend(pool=Depends(get_pool)):
    try:
        rows = await pool.fetch("SELECT * FROM vw_fp_trend ORDER BY week_label")
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── GET /api/model/thresholds ────────────────────────────────
@router.get("/thresholds")
async def get_thresholds(pool=Depends(get_pool)):
    try:
        rows = await pool.fetch(
            """
            SELECT mt.id::text, mt.category, mt.current_value, mt.fp_impact,
                   mt.recall_impact, mt.status,
                   tp.proposed_value, tp.id::text AS proposal_id, tp.status AS proposal_status,
                   inv.full_name AS proposed_by_name
            FROM model_thresholds mt
            LEFT JOIN LATERAL (
                SELECT * FROM threshold_proposals
                WHERE threshold_id = mt.id AND status = 'pending'
                ORDER BY proposed_at DESC LIMIT 1
            ) tp ON true
            LEFT JOIN investigators inv ON inv.id = tp.proposed_by
            ORDER BY mt.category
            """
        )
        return {"success": True, "data": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── POST /api/model/thresholds/:id/propose ──────────────────
class ProposeBody(BaseModel):
    proposed_value: float
    investigator_id: Optional[str] = None


@router.post("/thresholds/{threshold_id}/propose")
async def propose_threshold(
    threshold_id: str, body: ProposeBody, pool=Depends(get_pool)
):
    inv_id = body.investigator_id or DEFAULT_INV_ID

    async with pool.acquire() as conn:
        async with conn.transaction():
            th = await conn.fetchrow(
                "SELECT * FROM model_thresholds WHERE id = $1::uuid", threshold_id
            )
            if not th:
                raise HTTPException(status_code=404, detail="Threshold not found")

            is_blocked = body.proposed_value > float(th["current_value"]) + 0.05

            await conn.execute(
                """
                INSERT INTO threshold_proposals
                  (threshold_id, category, current_value, proposed_value,
                   fp_impact, recall_impact, status, proposed_by)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid)
                """,
                threshold_id, th["category"], th["current_value"],
                body.proposed_value, th["fp_impact"], th["recall_impact"],
                "blocked" if is_blocked else "pending", inv_id,
            )

            await conn.execute(
                "UPDATE model_thresholds SET status = $1, updated_at = NOW() WHERE id = $2::uuid",
                "blocked" if is_blocked else "pending", threshold_id,
            )

            await conn.execute(
                "INSERT INTO activity_log (event_type, description, source) VALUES ('alert', $1, 'system')",
                f'Threshold proposal submitted for "{th["category"]}" → '
                f"{body.proposed_value:.2f} — awaiting approval",
            )

    return {
        "success": True,
        "message": "Proposal submitted",
        "status": "blocked" if is_blocked else "pending",
    }


# ── PATCH /api/model/thresholds/:id/approve ─────────────────
class ApproveBody(BaseModel):
    investigator_id: Optional[str] = None


@router.patch("/thresholds/{threshold_id}/approve")
async def approve_threshold(
    threshold_id: str, body: ApproveBody, pool=Depends(get_pool)
):
    inv_id = body.investigator_id or DEFAULT_INV_ID

    async with pool.acquire() as conn:
        async with conn.transaction():
            th = await conn.fetchrow(
                "SELECT * FROM model_thresholds WHERE id = $1::uuid", threshold_id
            )
            if not th:
                raise HTTPException(status_code=404, detail="Threshold not found")

            prop = await conn.fetchrow(
                """
                SELECT * FROM threshold_proposals
                WHERE threshold_id = $1::uuid AND status = 'pending'
                ORDER BY proposed_at DESC LIMIT 1
                """,
                threshold_id,
            )
            if not prop:
                raise HTTPException(
                    status_code=400, detail="No pending proposal found"
                )

            await conn.execute(
                """
                UPDATE model_thresholds
                SET current_value = $1, status = 'approved',
                    updated_by = $2::uuid, updated_at = NOW()
                WHERE id = $3::uuid
                """,
                prop["proposed_value"], inv_id, threshold_id,
            )

            await conn.execute(
                """
                UPDATE threshold_proposals
                SET status = 'approved', approved_by = $1::uuid, resolved_at = NOW()
                WHERE id = $2
                """,
                inv_id, prop["id"],
            )

            await conn.execute(
                "INSERT INTO activity_log (event_type, description, source) VALUES ('activity', $1, 'system')",
                f'Threshold approved for "{th["category"]}" — '
                f"new value: {prop['proposed_value']}",
            )

    return {
        "success": True,
        "message": "Threshold approved and applied",
        "new_value": float(prop["proposed_value"]),
    }
