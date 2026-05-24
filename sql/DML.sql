-- ============================================================
-- FraudOS — Aiven PostgreSQL Schema
-- DML (Seed Data) | Version 1.0
-- ============================================================

-- ── Investigators ────────────────────────────────────────────
INSERT INTO rahul.investigators (id, username, full_name, email, role, department) VALUES
  ('11111111-0000-0000-0000-000000000001', 'sarah.chen',   'Sarah Chen',     'sarah.chen@centificai.com',   'fraud_investigator',  'Fraud Operations'),
  ('11111111-0000-0000-0000-000000000002', 'mike.torres',  'Mike Torres',    'mike.torres@centificai.com',  'senior_investigator', 'Fraud Operations'),
  ('11111111-0000-0000-0000-000000000003', 'james.park',   'James Park',     'james.park@centificai.com',   'fraud_investigator',  'Fraud Operations'),
  ('11111111-0000-0000-0000-000000000004', 'rajib.basu',   'Rajib Basu',     'rajib.basu@centificai.com',   'head_of_fraud',       'Risk Management'),
  ('11111111-0000-0000-0000-000000000005', 'yogesh.y',     'Yogesh Y',       'yogesh.y@centificai.com',     'compliance_team',     'Compliance'),
  ('11111111-0000-0000-0000-000000000006', 'admin',        'System Admin',   'admin@centificai.com',        'system_admin',        'IT')
ON CONFLICT (username) DO NOTHING;

-- ── Transactions ─────────────────────────────────────────────
INSERT INTO rahul.transactions (transaction_ref,amount,currency,location,merchant,device,merchant_category,account_id,model_source,if_score,lstm_score,ensemble_score,confidence_score,ai_explanation,status) VALUES
  ('TXN-20240424-0064', 34200.00,'USD','Hong Kong',          'Wire Transfer',     'Web-Browser',  'wire_transfer',  'ACC-1001','ensemble',       0.9600,0.9400,0.9700,0.9700,'CRITICAL: Wire transfer of $34,200 initiated from a new device in Hong Kong. The account has never made international wire transfers before. The receiving account was created only 2 weeks ago.','unreviewed'),
  ('TXN-20240424-0091',  8400.00,'USD','Lagos, Nigeria',     'Electronics Store', 'Mobile-iOS',   'electronics',    'ACC-1002','ensemble',       0.8700,0.9100,0.9200,0.9200,'Amount 6x usual spend in new country with unfamiliar device. Geolocation does not match any prior transaction history for this account.','unreviewed'),
  ('TXN-20240424-0088',  2150.00,'USD','Moscow, Russia',     'Crypto Exchange',   'Desktop-Win',  'crypto',         'ACC-1003','ensemble',       0.8400,0.8900,0.8800,0.8800,'Card-testing pattern: 12 rapid transactions then large crypto transfer to high-risk jurisdiction.','unreviewed'),
  ('TXN-20240424-0079', 15800.00,'EUR','Dubai, UAE',         'Luxury Goods',      'Tablet-iOS',   'luxury_retail',  'ACC-1004','lstm',           0.7100,0.9400,0.8500,0.8500,'Impossible travel: 8 transactions across 5 countries in 90 minutes. LSTM sequential anomaly score 0.94.','escalated'),
  ('TXN-20240424-0076',   499.00,'USD','London, UK',         'Streaming Service', 'Desktop-Mac',  'subscription',   'ACC-1005','isolation_forest',0.8300,0.5500,0.8100,0.8100,'Charge is 6x normal subscription amount. Card used in 3 countries in 24 hours.','unreviewed'),
  ('TXN-20240424-0072',  1200.00,'GBP','Paris, France',      'Hotel Booking',     'Mobile-iOS',   'travel',         'ACC-1006','ensemble',       0.7700,0.8200,0.8000,0.8000,'Card reported lost 2 days ago. Unknown billing address. IP address from known proxy network.','fraud'),
  ('TXN-20240424-0082',   320.00,'USD','New York, USA',      'Amazon',            'Mobile-Android','e_commerce',    'ACC-1007','isolation_forest',0.6100,0.4400,0.6100,0.6100,'Flagged at 3:47 AM local time. Amount and merchant within normal range for this account.','cleared'),
  ('TXN-20240424-0068',    89.00,'USD','Chicago, USA',       'Grocery Store',     'Contactless',  'grocery',        'ACC-1008','isolation_forest',0.5500,0.3800,0.5200,0.5200,'Velocity check: 4th transaction in 1 hour. Amount and merchant category are normal.','cleared')
ON CONFLICT (transaction_ref) DO NOTHING;

-- ── Audit log seed (for the fraud and cleared ones above) ────
INSERT INTO rahul.audit_log (transaction_id, transaction_ref, investigator_id, investigator_name, action, ensemble_score, notes, decided_at)
SELECT t.id, t.transaction_ref,
       '11111111-0000-0000-0000-000000000001', 'Sarah Chen',
       'fraud', t.ensemble_score,
       'Card confirmed lost. Billing address mismatch verified with customer.',
       NOW() - INTERVAL '2 hours'
FROM rahul.transactions t WHERE t.transaction_ref = 'TXN-20240424-0072'
ON CONFLICT DO NOTHING;

INSERT INTO rahul.audit_log (transaction_id, transaction_ref, investigator_id, investigator_name, action, ensemble_score, notes, decided_at)
SELECT t.id, t.transaction_ref,
       '11111111-0000-0000-0000-000000000003', 'James Park',
       'cleared', t.ensemble_score,
       'Verified with customer. Regular grocery run at unusual hour. Not fraud.',
       NOW() - INTERVAL '3 hours'
FROM rahul.transactions t WHERE t.transaction_ref = 'TXN-20240424-0068'
ON CONFLICT DO NOTHING;

INSERT INTO rahul.audit_log (transaction_id, transaction_ref, investigator_id, investigator_name, action, ensemble_score, notes, decided_at)
SELECT t.id, t.transaction_ref,
       '11111111-0000-0000-0000-000000000001', 'Sarah Chen',
       'cleared', t.ensemble_score,
       'Customer confirmed 3 AM purchase. False positive.',
       NOW() - INTERVAL '4 hours'
FROM rahul.transactions t WHERE t.transaction_ref = 'TXN-20240424-0082'
ON CONFLICT DO NOTHING;

INSERT INTO rahul.audit_log (transaction_id, transaction_ref, investigator_id, investigator_name, action, ensemble_score, notes, decided_at)
SELECT t.id, t.transaction_ref,
       '11111111-0000-0000-0000-000000000002', 'Mike Torres',
       'escalated', t.ensemble_score,
       'Impossible travel confirmed by flight records check. Escalated to senior.',
       NOW() - INTERVAL '1 hour'
FROM rahul.transactions t WHERE t.transaction_ref = 'TXN-20240424-0079'
ON CONFLICT DO NOTHING;

-- ── Model metrics (8 weeks of FP rate trend) ────────────────
INSERT INTO rahul.model_metrics (model_name, model_version, precision_val, recall_val, f1_score, fp_rate, week_label) VALUES
  ('isolation_forest','v1.0',0.7200,0.9300,0.8130,0.9200,'W1'),
  ('isolation_forest','v1.0',0.7800,0.9380,0.8510,0.8400,'W2'),
  ('isolation_forest','v1.0',0.8100,0.9420,0.8710,0.7100,'W3'),
  ('isolation_forest','v1.0',0.8400,0.9500,0.8920,0.6000,'W4'),
  ('isolation_forest','v1.0',0.8700,0.9560,0.9110,0.4800,'W5'),
  ('isolation_forest','v1.0',0.8820,0.9590,0.9190,0.3900,'W6'),
  ('isolation_forest','v1.0',0.8890,0.9600,0.9230,0.3300,'W7'),
  ('isolation_forest','v1.0',0.8930,0.9610,0.9260,0.2840,'W8'),
  ('lstm',            'v1.0',0.7400,0.9100,0.8160,0.8900,'W1'),
  ('lstm',            'v1.0',0.7900,0.9200,0.8510,0.8000,'W2'),
  ('lstm',            'v1.0',0.8200,0.9340,0.8730,0.6800,'W3'),
  ('lstm',            'v1.0',0.8500,0.9450,0.8950,0.5700,'W4'),
  ('lstm',            'v1.0',0.8800,0.9510,0.9150,0.4500,'W5'),
  ('lstm',            'v1.0',0.8950,0.9530,0.9230,0.3600,'W6'),
  ('lstm',            'v1.0',0.9050,0.9540,0.9290,0.3000,'W7'),
  ('lstm',            'v1.0',0.9170,0.9540,0.9350,0.2410,'W8'),
  ('ensemble',        'v1.0',0.7800,0.9400,0.8520,0.8500,'W1'),
  ('ensemble',        'v1.0',0.8200,0.9500,0.8810,0.7500,'W2'),
  ('ensemble',        'v1.0',0.8600,0.9600,0.9070,0.6200,'W3'),
  ('ensemble',        'v1.0',0.8900,0.9640,0.9250,0.5100,'W4'),
  ('ensemble',        'v1.0',0.9100,0.9680,0.9380,0.4000,'W5'),
  ('ensemble',        'v1.0',0.9250,0.9700,0.9470,0.3200,'W6'),
  ('ensemble',        'v1.0',0.9320,0.9710,0.9510,0.2800,'W7'),
  ('ensemble',        'v1.0',0.9380,0.9720,0.9550,0.2160,'W8');

-- ── Model thresholds (current live) ─────────────────────────
INSERT INTO rahul.model_thresholds (category, current_value, fp_impact, recall_impact, status) VALUES
  ('Small International Transfer', 0.80, '-22% FP', '-1.2% recall', 'pending'),
  ('High-Value Card Present',       0.75, '-8% FP',  '+0.3% recall', 'approved'),
  ('Wallet Transfer Domestic',      0.82, '-14% FP', '-3.1% recall', 'blocked'),
  ('E-commerce High Value',         0.78, 'No change','0%',          'approved'),
  ('Crypto Exchange',               0.70, '-10% FP', '-0.8% recall', 'pending')
ON CONFLICT (category) DO NOTHING;

-- ── Threshold proposals ──────────────────────────────────────
INSERT INTO rahul.threshold_proposals (threshold_id, category, current_value, proposed_value, fp_impact, recall_impact, status, proposed_by, proposed_at)
SELECT mt.id, mt.category, mt.current_value, 0.86, '-22% FP', '-1.2% recall', 'pending',
       '11111111-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'
FROM rahul.model_thresholds mt WHERE mt.category = 'Small International Transfer'
ON CONFLICT DO NOTHING;

INSERT INTO rahul.threshold_proposals (threshold_id, category, current_value, proposed_value, fp_impact, recall_impact, status, proposed_by, proposed_at)
SELECT mt.id, mt.category, mt.current_value, 0.75, '-10% FP', '-0.8% recall', 'pending',
       '11111111-0000-0000-0000-000000000002', NOW() - INTERVAL '6 hours'
FROM rahul.model_thresholds mt WHERE mt.category = 'Crypto Exchange'
ON CONFLICT DO NOTHING;

-- ── Compliance reports (last 4 days) ────────────────────────
INSERT INTO rahul.compliance_reports (report_date, total_processed, total_flagged, confirmed_fraud, cleared_count, escalated_count, fp_rate, precision_ensemble, recall_ensemble, f1_ensemble, review_completion, llm_helpful_rate, generated_at, delivered_at) VALUES
  (CURRENT_DATE,          5120000, 312, 28, 265, 5, 0.2840, 0.9380, 0.9720, 0.9550, 0.9420, 0.8700, NOW(), NOW()),
  (CURRENT_DATE - 1,      4980000, 298, 31, 255, 4, 0.2910, 0.9350, 0.9700, 0.9520, 0.9380, 0.8620, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  (CURRENT_DATE - 2,      5210000, 341, 35, 290, 6, 0.3460, 0.9310, 0.9670, 0.9480, 0.9210, 0.8540, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  (CURRENT_DATE - 3,      5080000, 287, 26, 248, 3, 0.2980, 0.9360, 0.9710, 0.9530, 0.9450, 0.8680, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (report_date) DO NOTHING;

-- ── Activity log seed ────────────────────────────────────────
INSERT INTO rahul.activity_log (event_type, description, source, created_at) VALUES
  ('detection', 'High-risk TXN-0091 flagged — $8,400 Lagos, Nigeria (Score: 0.92)',              'model_pipeline', NOW() - INTERVAL '43 min'),
  ('alert',     'Ensemble model flagged sequential pattern on account #7741',                     'model_pipeline', NOW() - INTERVAL '47 min'),
  ('activity',  'Sarah Chen cleared TXN-0082 as false positive',                                  'sarah.chen',     NOW() - INTERVAL '57 min'),
  ('detection', 'CRITICAL: Wire $34,200 flagged (Score: 0.97) — new device Hong Kong',            'model_pipeline', NOW() - INTERVAL '1 hour 10 min'),
  ('alert',     'Threshold update proposal pending Head of Fraud approval',                        'system',         NOW() - INTERVAL '1 hour 35 min'),
  ('activity',  'Mike Torres escalated TXN-0079 — impossible travel pattern confirmed',            'mike.torres',    NOW() - INTERVAL '1 hour 28 min'),
  ('clear',     'TXN-0068 cleared — velocity check identified as false positive',                  'james.park',     NOW() - INTERVAL '2 hours 17 min'),
  ('detection', 'LSTM model detected impossible travel pattern on account #3329',                  'model_pipeline', NOW() - INTERVAL '2 hours 41 min')
ON CONFLICT DO NOTHING;
