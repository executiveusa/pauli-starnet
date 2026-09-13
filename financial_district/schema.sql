PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  legal_entity TEXT,
  base_currency TEXT NOT NULL CHECK(length(base_currency)=3),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS build_receipts (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  build_id TEXT NOT NULL,
  agent_id TEXT,
  trace_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  status TEXT NOT NULL CHECK(status IN ('succeeded','failed','cancelled','partial','unknown')),
  currency TEXT NOT NULL CHECK(length(currency)=3),
  estimated_minor_units INTEGER CHECK(estimated_minor_units IS NULL OR estimated_minor_units >= 0),
  list_minor_units INTEGER CHECK(list_minor_units IS NULL OR list_minor_units >= 0),
  credit_minor_units INTEGER CHECK(credit_minor_units IS NULL OR credit_minor_units >= 0),
  actual_billed_minor_units INTEGER CHECK(actual_billed_minor_units IS NULL OR actual_billed_minor_units >= 0),
  reconciliation_status TEXT NOT NULL CHECK(reconciliation_status IN ('estimated','provider_reported','invoice_reconciled','unknown')),
  budget_decision_ref TEXT,
  body_json TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  supersedes_receipt_id TEXT,
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, receipt_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
  FOREIGN KEY (tenant_id, supersedes_receipt_id) REFERENCES build_receipts(tenant_id, receipt_id)
);
CREATE TABLE IF NOT EXISTS model_usage (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT,
  calls INTEGER NOT NULL CHECK(calls >= 0),
  input_units INTEGER CHECK(input_units IS NULL OR input_units >= 0),
  output_units INTEGER CHECK(output_units IS NULL OR output_units >= 0),
  cached_units INTEGER CHECK(cached_units IS NULL OR cached_units >= 0),
  unit_name TEXT,
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  PRIMARY KEY (tenant_id, receipt_id, ordinal),
  FOREIGN KEY (tenant_id, receipt_id) REFERENCES build_receipts(tenant_id, receipt_id)
);
CREATE TABLE IF NOT EXISTS tool_usage (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  name TEXT NOT NULL,
  calls INTEGER NOT NULL CHECK(calls >= 0),
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  outcome TEXT NOT NULL,
  PRIMARY KEY (tenant_id, receipt_id, ordinal),
  FOREIGN KEY (tenant_id, receipt_id) REFERENCES build_receipts(tenant_id, receipt_id)
);
CREATE TABLE IF NOT EXISTS infrastructure_usage (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity >= 0),
  unit TEXT NOT NULL,
  region TEXT,
  PRIMARY KEY (tenant_id, receipt_id, ordinal),
  FOREIGN KEY (tenant_id, receipt_id) REFERENCES build_receipts(tenant_id, receipt_id)
);
CREATE TABLE IF NOT EXISTS budget_decisions (
  tenant_id TEXT NOT NULL,
  budget_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  limit_minor_units INTEGER NOT NULL CHECK(limit_minor_units >= 0),
  owner_evidence_ref TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('approved','exhausted','revoked','expired')),
  created_at TEXT NOT NULL,
  expires_at TEXT,
  PRIMARY KEY (tenant_id, budget_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);
CREATE TABLE IF NOT EXISTS money_events (
  tenant_id TEXT NOT NULL,
  money_event_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('incoming','outgoing')),
  kind TEXT NOT NULL CHECK(kind IN ('invoice','payment','refund','payout','fee','commission','grant','tax','transfer','other')),
  state TEXT NOT NULL CHECK(state IN ('draft','requested','approved','authorized','settled','failed','cancelled','reversed')),
  currency TEXT NOT NULL,
  gross_minor_units INTEGER NOT NULL CHECK(gross_minor_units >= 0),
  fee_minor_units INTEGER NOT NULL DEFAULT 0 CHECK(fee_minor_units >= 0),
  tax_minor_units INTEGER CHECK(tax_minor_units IS NULL OR tax_minor_units >= 0),
  net_minor_units INTEGER NOT NULL,
  counterparty_ref TEXT,
  source_system TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  owner_evidence_ref TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  body_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, money_event_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);
CREATE TABLE IF NOT EXISTS journal_entries (
  tenant_id TEXT NOT NULL,
  journal_entry_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  description TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  reversal_of TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, journal_entry_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
  FOREIGN KEY (tenant_id, reversal_of) REFERENCES journal_entries(tenant_id, journal_entry_id)
);
CREATE TABLE IF NOT EXISTS journal_lines (
  tenant_id TEXT NOT NULL,
  journal_entry_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  debit_minor_units INTEGER NOT NULL DEFAULT 0 CHECK(debit_minor_units >= 0),
  credit_minor_units INTEGER NOT NULL DEFAULT 0 CHECK(credit_minor_units >= 0),
  currency TEXT NOT NULL,
  memo TEXT,
  PRIMARY KEY (tenant_id, journal_entry_id, ordinal),
  FOREIGN KEY (tenant_id, journal_entry_id) REFERENCES journal_entries(tenant_id, journal_entry_id)
);
CREATE TABLE IF NOT EXISTS payment_adapters (
  tenant_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  rail TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('disabled','sandbox','live')),
  configured INTEGER NOT NULL DEFAULT 0 CHECK(configured IN (0,1)),
  last_verified_at TEXT,
  PRIMARY KEY (tenant_id, adapter_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
  CHECK(mode != 'live')
);
CREATE TABLE IF NOT EXISTS tax_records (
  tenant_id TEXT NOT NULL,
  tax_record_id TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  classification_status TEXT NOT NULL CHECK(classification_status IN ('unreviewed','prepared','professional_reviewed','filed_external')),
  source_refs_json TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, tax_record_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);
CREATE VIEW IF NOT EXISTS v_build_tokenomics AS
SELECT r.tenant_id, r.project_id, r.build_id, r.receipt_id, r.agent_id,
       r.status, r.currency, r.duration_ms,
       r.estimated_minor_units, r.list_minor_units, r.credit_minor_units,
       r.actual_billed_minor_units, r.reconciliation_status,
       COALESCE(SUM(m.calls),0) AS model_calls,
       SUM(m.input_units) AS input_units, SUM(m.output_units) AS output_units,
       SUM(m.cached_units) AS cached_units
FROM build_receipts r
LEFT JOIN model_usage m ON m.tenant_id=r.tenant_id AND m.receipt_id=r.receipt_id
GROUP BY r.tenant_id, r.receipt_id;
CREATE VIEW IF NOT EXISTS v_model_tokenomics AS
SELECT r.tenant_id, r.project_id, m.provider, m.model, m.version, r.currency,
       COUNT(DISTINCT r.receipt_id) AS builds, SUM(m.calls) AS calls,
       SUM(m.input_units) AS input_units, SUM(m.output_units) AS output_units,
       SUM(m.cached_units) AS cached_units, SUM(m.duration_ms) AS model_duration_ms,
       SUM(r.actual_billed_minor_units) AS receipt_actual_billed_minor_units
FROM build_receipts r JOIN model_usage m
ON m.tenant_id=r.tenant_id AND m.receipt_id=r.receipt_id
GROUP BY r.tenant_id, r.project_id, m.provider, m.model, m.version, r.currency;
CREATE VIEW IF NOT EXISTS v_money_summary AS
SELECT tenant_id, direction, kind, state, currency,
       COUNT(*) AS event_count, SUM(gross_minor_units) AS gross_minor_units,
       SUM(fee_minor_units) AS fee_minor_units, SUM(tax_minor_units) AS tax_minor_units,
       SUM(net_minor_units) AS net_minor_units
FROM money_events GROUP BY tenant_id, direction, kind, state, currency;
CREATE VIEW IF NOT EXISTS v_trial_balance AS
SELECT tenant_id, account_code, currency,
       SUM(debit_minor_units) AS debits, SUM(credit_minor_units) AS credits,
       SUM(debit_minor_units-credit_minor_units) AS balance
FROM journal_lines GROUP BY tenant_id, account_code, currency;
