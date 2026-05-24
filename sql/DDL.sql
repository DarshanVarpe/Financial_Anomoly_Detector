-- ============================================================
-- FraudOS — Aiven PostgreSQL Schema
-- DDL | Version 1.0
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SCHEMA
-- ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS rahul;
SET search_path TO rahul, public;

-- ────────────────────────────────────────────────────────────
-- DROP (safe re-run order)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS activity_log         CASCADE;
DROP TABLE IF EXISTS audit_log            CASCADE;
DROP TABLE IF EXISTS compliance_reports   CASCADE;
DROP TABLE IF EXISTS threshold_proposals  CASCADE;
DROP TABLE IF EXISTS model_thresholds     CASCADE;
DROP TABLE IF EXISTS model_metrics        CASCADE;
DROP TABLE IF EXISTS transactions         CASCADE;
DROP TABLE IF EXISTS investigators        CASCADE;

-- ════════════════════════════════════════════════════════════
-- TABLE: investigators
-- ════════════════════════════════════════════════════════════
CREATE TABLE investigators (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(80)   NOT NULL UNIQUE,
    full_name     VARCHAR(120)  NOT NULL,
    email         VARCHAR(180)  NOT NULL UNIQUE,
    role          VARCHAR(40)   NOT NULL
                    CHECK (role IN ('fraud_investigator','senior_investigator',
                                    'head_of_fraud','compliance_team',
                                    'ml_engineer','system_admin')),
    department    VARCHAR(80),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investigators_role ON investigators(role);

-- ════════════════════════════════════════════════════════════
-- TABLE: transactions
-- ════════════════════════════════════════════════════════════
CREATE TABLE transactions (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref     VARCHAR(30)   NOT NULL UNIQUE,     -- e.g. TXN-20240424-0091
    amount              NUMERIC(14,2) NOT NULL,
    currency            CHAR(3)       NOT NULL DEFAULT 'USD',
    location            VARCHAR(120),
    merchant            VARCHAR(120),
    device              VARCHAR(80),
    payment_channel     VARCHAR(40)   DEFAULT 'card',      -- card | wallet | bank_transfer
    merchant_category   VARCHAR(80),
    account_id          VARCHAR(40),
    model_source        VARCHAR(20)   NOT NULL
                            CHECK (model_source IN ('isolation_forest','lstm','ensemble')),
    if_score            NUMERIC(5,4)  CHECK (if_score BETWEEN 0 AND 1),
    lstm_score          NUMERIC(5,4)  CHECK (lstm_score BETWEEN 0 AND 1),
    ensemble_score      NUMERIC(5,4)  CHECK (ensemble_score BETWEEN 0 AND 1),
    confidence_score    NUMERIC(5,4)  CHECK (confidence_score BETWEEN 0 AND 1),
    ai_explanation      TEXT,
    status              VARCHAR(20)   NOT NULL DEFAULT 'unreviewed'
                            CHECK (status IN ('unreviewed','fraud','cleared','escalated')),
    reviewed_by         UUID          REFERENCES investigators(id),
    reviewed_at         TIMESTAMPTZ,
    notes               TEXT,
    flagged_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_status        ON transactions(status);
CREATE INDEX idx_transactions_ensemble      ON transactions(ensemble_score DESC);
CREATE INDEX idx_transactions_flagged_at    ON transactions(flagged_at DESC);
CREATE INDEX idx_transactions_ref           ON transactions(transaction_ref);
CREATE INDEX idx_transactions_account       ON transactions(account_id);

-- ════════════════════════════════════════════════════════════
-- TABLE: audit_log
-- Every investigator decision is recorded here (immutable)
-- ════════════════════════════════════════════════════════════
CREATE TABLE audit_log (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id   UUID         NOT NULL REFERENCES transactions(id),
    transaction_ref  VARCHAR(30)  NOT NULL,
    investigator_id  UUID         NOT NULL REFERENCES investigators(id),
    investigator_name VARCHAR(120) NOT NULL,
    action           VARCHAR(20)  NOT NULL
                         CHECK (action IN ('fraud','cleared','escalated')),
    ensemble_score   NUMERIC(5,4),
    notes            TEXT,
    decided_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_transaction   ON audit_log(transaction_id);
CREATE INDEX idx_audit_investigator  ON audit_log(investigator_id);
CREATE INDEX idx_audit_decided_at    ON audit_log(decided_at DESC);
CREATE INDEX idx_audit_action        ON audit_log(action);

-- ════════════════════════════════════════════════════════════
-- TABLE: activity_log  (live commentary feed)
-- ════════════════════════════════════════════════════════════
CREATE TABLE activity_log (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type   VARCHAR(20)  NOT NULL
                     CHECK (event_type IN ('detection','alert','activity','clear')),
    description  TEXT         NOT NULL,
    source       VARCHAR(60)  DEFAULT 'system',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_type    ON activity_log(event_type);

-- ════════════════════════════════════════════════════════════
-- TABLE: model_metrics  (precision / recall / F1 per model)
-- ════════════════════════════════════════════════════════════
CREATE TABLE model_metrics (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name    VARCHAR(40)   NOT NULL,   -- isolation_forest | lstm | ensemble
    model_version VARCHAR(20)   NOT NULL DEFAULT 'v1.0',
    precision_val NUMERIC(5,4)  NOT NULL,
    recall_val    NUMERIC(5,4)  NOT NULL,
    f1_score      NUMERIC(5,4)  NOT NULL,
    fp_rate       NUMERIC(5,4)  NOT NULL,
    week_label    VARCHAR(10)   NOT NULL,   -- e.g. W1, W2 …
    recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_model   ON model_metrics(model_name);
CREATE INDEX idx_metrics_week    ON model_metrics(week_label);

-- ════════════════════════════════════════════════════════════
-- TABLE: model_thresholds  (current live thresholds)
-- ════════════════════════════════════════════════════════════
CREATE TABLE model_thresholds (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    category         VARCHAR(80)   NOT NULL UNIQUE,
    current_value    NUMERIC(5,4)  NOT NULL,
    fp_impact        VARCHAR(30),
    recall_impact    VARCHAR(30),
    status           VARCHAR(20)   NOT NULL DEFAULT 'approved'
                         CHECK (status IN ('pending','approved','blocked')),
    updated_by       UUID          REFERENCES investigators(id),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- TABLE: threshold_proposals  (pending change requests)
-- ════════════════════════════════════════════════════════════
CREATE TABLE threshold_proposals (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    threshold_id      UUID          NOT NULL REFERENCES model_thresholds(id),
    category          VARCHAR(80)   NOT NULL,
    current_value     NUMERIC(5,4)  NOT NULL,
    proposed_value    NUMERIC(5,4)  NOT NULL,
    fp_impact         VARCHAR(30),
    recall_impact     VARCHAR(30),
    status            VARCHAR(20)   NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','blocked','rejected')),
    proposed_by       UUID          NOT NULL REFERENCES investigators(id),
    approved_by       UUID          REFERENCES investigators(id),
    proposed_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_proposals_status   ON threshold_proposals(status);
CREATE INDEX idx_proposals_category ON threshold_proposals(category);

-- ════════════════════════════════════════════════════════════
-- TABLE: compliance_reports  (generated PDF metadata)
-- ════════════════════════════════════════════════════════════
CREATE TABLE compliance_reports (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date          DATE          NOT NULL UNIQUE,
    total_processed      BIGINT        NOT NULL DEFAULT 0,
    total_flagged        INTEGER       NOT NULL DEFAULT 0,
    confirmed_fraud      INTEGER       NOT NULL DEFAULT 0,
    cleared_count        INTEGER       NOT NULL DEFAULT 0,
    escalated_count      INTEGER       NOT NULL DEFAULT 0,
    fp_rate              NUMERIC(5,4),
    precision_ensemble   NUMERIC(5,4),
    recall_ensemble      NUMERIC(5,4),
    f1_ensemble          NUMERIC(5,4),
    review_completion    NUMERIC(5,4),
    llm_helpful_rate     NUMERIC(5,4),
    generated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    delivered_at         TIMESTAMPTZ,
    report_version       VARCHAR(10)   DEFAULT 'v1'
);

CREATE INDEX idx_reports_date ON compliance_reports(report_date DESC);

-- ════════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_updated
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_investigators_updated
    BEFORE UPDATE ON investigators
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ════════════════════════════════════════════════════════════
-- VIEWS (useful for reports and dashboard queries)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT
  COUNT(*)                                                    AS total_flagged,
  COUNT(*) FILTER (WHERE status = 'fraud')                    AS confirmed_fraud,
  COUNT(*) FILTER (WHERE status = 'cleared')                  AS cleared_count,
  COUNT(*) FILTER (WHERE status = 'escalated')                AS escalated_count,
  COUNT(*) FILTER (WHERE status = 'unreviewed')               AS unreviewed_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'cleared') /
    NULLIF(COUNT(*) FILTER (WHERE status <> 'unreviewed'), 0), 2
  )                                                           AS fp_rate_pct
FROM transactions
WHERE DATE(flagged_at) = CURRENT_DATE;

CREATE OR REPLACE VIEW vw_latest_metrics AS
SELECT DISTINCT ON (model_name)
    model_name, model_version, precision_val, recall_val, f1_score, fp_rate, week_label, recorded_at
FROM model_metrics
ORDER BY model_name, recorded_at DESC;

CREATE OR REPLACE VIEW vw_fp_trend AS
SELECT week_label,
    MAX(fp_rate) FILTER (WHERE model_name = 'ensemble') AS ensemble_fp,
    MAX(fp_rate) FILTER (WHERE model_name = 'isolation_forest') AS if_fp,
    MAX(fp_rate) FILTER (WHERE model_name = 'lstm') AS lstm_fp
FROM model_metrics
GROUP BY week_label
ORDER BY week_label;
