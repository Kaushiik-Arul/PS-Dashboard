BEGIN;

CREATE TABLE IF NOT EXISTS public.mrm_reports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  reporting_month DATE NOT NULL UNIQUE,
  data_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalized_by UUID REFERENCES public.auth_accounts(account_id),
  finalized_at TIMESTAMPTZ,
  CONSTRAINT mrm_reports_reporting_month_check
    CHECK (reporting_month = DATE_TRUNC('month', reporting_month)::DATE),
  CONSTRAINT mrm_reports_data_month_check
    CHECK (data_month = (reporting_month - INTERVAL '1 month')::DATE),
  CONSTRAINT mrm_reports_finalized_audit_check
    CHECK (
      (status = 'draft' AND finalized_by IS NULL AND finalized_at IS NULL)
      OR (status = 'finalized' AND finalized_by IS NOT NULL AND finalized_at IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.mrm_row_definitions (
  row_key TEXT PRIMARY KEY CHECK (BTRIM(row_key) <> ''),
  title TEXT NOT NULL CHECK (BTRIM(title) <> ''),
  description TEXT NOT NULL DEFAULT '',
  value_mode TEXT NOT NULL CHECK (value_mode IN ('manual', 'calculated')),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  emphasized BOOLEAN NOT NULL DEFAULT TRUE,
  active_from_month DATE NOT NULL,
  active_to_month DATE,
  managed BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT mrm_row_definitions_active_from_check
    CHECK (active_from_month = DATE_TRUNC('month', active_from_month)::DATE),
  CONSTRAINT mrm_row_definitions_active_to_check
    CHECK (
      active_to_month IS NULL
      OR (
        active_to_month = DATE_TRUNC('month', active_to_month)::DATE
        AND active_to_month >= active_from_month
      )
    )
);

CREATE TABLE IF NOT EXISTS public.mrm_column_definitions (
  column_key TEXT PRIMARY KEY CHECK (BTRIM(column_key) <> ''),
  label TEXT NOT NULL CHECK (BTRIM(label) <> ''),
  column_type TEXT NOT NULL CHECK (column_type IN ('value', 'status', 'attachment')),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  rolling_month_offset INTEGER,
  active_from_month DATE NOT NULL,
  active_to_month DATE,
  managed BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT mrm_column_definitions_active_from_check
    CHECK (active_from_month = DATE_TRUNC('month', active_from_month)::DATE),
  CONSTRAINT mrm_column_definitions_active_to_check
    CHECK (
      active_to_month IS NULL
      OR (
        active_to_month = DATE_TRUNC('month', active_to_month)::DATE
        AND active_to_month >= active_from_month
      )
    )
);

CREATE TABLE IF NOT EXISTS public.mrm_report_columns (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  report_id UUID NOT NULL REFERENCES public.mrm_reports(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL CHECK (BTRIM(column_key) <> ''),
  definition_key TEXT REFERENCES public.mrm_column_definitions(column_key) ON DELETE RESTRICT,
  label TEXT NOT NULL CHECK (BTRIM(label) <> ''),
  column_type TEXT NOT NULL CHECK (column_type IN ('value', 'status', 'attachment')),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  managed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (report_id, column_key),
  CONSTRAINT mrm_report_columns_managed_definition_check
    CHECK (NOT managed OR definition_key IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.mrm_cells (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  report_id UUID NOT NULL REFERENCES public.mrm_reports(id) ON DELETE CASCADE,
  row_key TEXT NOT NULL REFERENCES public.mrm_row_definitions(row_key) ON DELETE RESTRICT,
  report_column_id UUID NOT NULL REFERENCES public.mrm_report_columns(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT 'null'::JSONB,
  value_source TEXT NOT NULL CHECK (value_source IN ('manual', 'calculated')),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (report_id, row_key, report_column_id)
);

CREATE TABLE IF NOT EXISTS public.mrm_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  report_id UUID NOT NULL REFERENCES public.mrm_reports(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL CHECK (BTRIM(metric_key) <> ''),
  range_key TEXT NOT NULL DEFAULT '',
  org_unit_key TEXT NOT NULL DEFAULT '',
  numerator NUMERIC NOT NULL,
  denominator NUMERIC,
  quality_count BIGINT NOT NULL DEFAULT 0 CHECK (quality_count >= 0),
  UNIQUE (report_id, metric_key, range_key, org_unit_key),
  CONSTRAINT mrm_metric_snapshots_denominator_check
    CHECK (denominator IS NULL OR denominator >= 0)
);

CREATE TABLE IF NOT EXISTS public.mrm_attachments (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  report_id UUID NOT NULL REFERENCES public.mrm_reports(id) ON DELETE CASCADE,
  row_key TEXT NOT NULL REFERENCES public.mrm_row_definitions(row_key) ON DELETE RESTRICT,
  report_column_id UUID NOT NULL REFERENCES public.mrm_report_columns(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL CHECK (BTRIM(original_filename) <> ''),
  safe_filename TEXT NOT NULL CHECK (BTRIM(safe_filename) <> ''),
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  )),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  content BYTEA NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mrm_attachments_content_size_check
    CHECK (OCTET_LENGTH(content) = size_bytes)
);

CREATE TABLE IF NOT EXISTS public.mrm_report_snapshots (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  report_id UUID NOT NULL UNIQUE REFERENCES public.mrm_reports(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  payload JSONB NOT NULL CHECK (JSONB_TYPEOF(payload) = 'object'),
  checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.mrm_audit_events (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID REFERENCES public.mrm_reports(id) ON DELETE SET NULL,
  actor_account_id UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'draft_saved', 'report_finalized', 'attachment_uploaded', 'attachment_deleted'
  )),
  event_details JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (JSONB_TYPEOF(event_details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mrm_reports_status_month_idx
  ON public.mrm_reports (status, reporting_month DESC);
CREATE INDEX IF NOT EXISTS mrm_row_definitions_active_idx
  ON public.mrm_row_definitions (active_from_month, active_to_month, display_order);
CREATE INDEX IF NOT EXISTS mrm_column_definitions_active_idx
  ON public.mrm_column_definitions (active_from_month, active_to_month, display_order);
CREATE INDEX IF NOT EXISTS mrm_cells_report_row_idx
  ON public.mrm_cells (report_id, row_key);
CREATE INDEX IF NOT EXISTS mrm_report_columns_order_idx
  ON public.mrm_report_columns (report_id, display_order);
CREATE INDEX IF NOT EXISTS mrm_metric_snapshots_scope_idx
  ON public.mrm_metric_snapshots (report_id, metric_key, range_key, org_unit_key);
CREATE INDEX IF NOT EXISTS mrm_attachments_report_cell_idx
  ON public.mrm_attachments (report_id, row_key, report_column_id);
CREATE INDEX IF NOT EXISTS mrm_audit_events_report_idx
  ON public.mrm_audit_events (report_id, created_at DESC);

INSERT INTO public.mrm_row_definitions
  (row_key, title, description, value_mode, display_order, highlighted, muted, emphasized, active_from_month, managed)
VALUES
  ('pul', 'PUL', '', 'manual', 0, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('indirect-mss', 't/o M&SS (Indirect Blue Collar)', '', 'calculated', 1, FALSE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('direct-mss', 'Direct M&SS', '', 'calculated', 2, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('total-mss', 'Total M&SS', '', 'calculated', 3, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('workforce-outside-pul', 'Workforce not part of PUL', 'GA+MA+Ext', 'manual', 4, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('esp-wc-napsgre', 't/o ESP (WC) + NAPSGRE', '', 'manual', 5, FALSE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('esp-bca', 't/o ESP (BCA)', '', 'manual', 6, TRUE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('ga-ma', 't/o GA & MA', '', 'manual', 7, TRUE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('pcd-direct-hc', 'PCd (Direct HC)', '', 'manual', 8, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('permanent', 't/o Permanent', '', 'manual', 9, FALSE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('temporary', 't/o Temporary', '', 'manual', 10, FALSE, FALSE, FALSE, DATE '2025-01-01', TRUE),
  ('hiring', 'Hiring performance (WC)', 'Turn around time - Job Ad to offer date', 'manual', 11, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('expat', 'Expat', '1% of PUL26', 'calculated', 12, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('attrition', 'Attrition', 'Exit from organization', 'calculated', 13, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('rotation', 'Job Rotation', 't/o Transfer within Bosch', 'calculated', 14, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('transfer', 't/o Transfer within plant / within Corp', '', 'calculated', 15, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('sul', 'SUL', '', 'calculated', 16, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('women-slx', 'Women in SLx', '', 'calculated', 17, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('women-hc', '% Women in overall HC (M&SS)', '', 'calculated', 18, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('gender-hiring', 'Gender Diversity Hiring', '', 'calculated', 19, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('succession', 'Succession Planning Coverage (SLx)', '', 'manual', 20, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE)
ON CONFLICT (row_key) DO NOTHING;

INSERT INTO public.mrm_column_definitions
  (column_key, label, column_type, display_order, rolling_month_offset, active_from_month, managed)
VALUES
  ('actual', 'Actual\n2025', 'value', 0, NULL, DATE '2025-01-01', TRUE),
  ('target', 'Target\nTBP''26', 'value', 1, NULL, DATE '2025-01-01', TRUE),
  ('rolling-previous', 'Previous month', 'value', 2, -2, DATE '2025-01-01', TRUE),
  ('rolling-latest', 'Latest month', 'value', 3, -1, DATE '2025-01-01', TRUE),
  ('status', 'YTD against TBP', 'status', 4, NULL, DATE '2025-01-01', TRUE),
  ('attachments', 'Attachments', 'attachment', 5, NULL, DATE '2025-01-01', TRUE)
ON CONFLICT (column_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reject_finalized_mrm_report_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_report_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'mrm_reports' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized MRM report % is immutable', OLD.id
        USING ERRCODE = '55000';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  parent_report_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.report_id ELSE NEW.report_id END;
  IF EXISTS (
    SELECT 1
    FROM public.mrm_reports
    WHERE id = parent_report_id AND status = 'finalized'
  ) THEN
    RAISE EXCEPTION 'Finalized MRM report % is immutable', parent_report_id
      USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS mrm_reports_immutable_trigger ON public.mrm_reports;
CREATE TRIGGER mrm_reports_immutable_trigger
BEFORE UPDATE OR DELETE ON public.mrm_reports
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

DROP TRIGGER IF EXISTS mrm_report_columns_immutable_trigger ON public.mrm_report_columns;
CREATE TRIGGER mrm_report_columns_immutable_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mrm_report_columns
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

DROP TRIGGER IF EXISTS mrm_cells_immutable_trigger ON public.mrm_cells;
CREATE TRIGGER mrm_cells_immutable_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mrm_cells
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

DROP TRIGGER IF EXISTS mrm_metric_snapshots_immutable_trigger ON public.mrm_metric_snapshots;
CREATE TRIGGER mrm_metric_snapshots_immutable_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mrm_metric_snapshots
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

DROP TRIGGER IF EXISTS mrm_attachments_immutable_trigger ON public.mrm_attachments;
CREATE TRIGGER mrm_attachments_immutable_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mrm_attachments
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

DROP TRIGGER IF EXISTS mrm_report_snapshots_immutable_trigger ON public.mrm_report_snapshots;
CREATE TRIGGER mrm_report_snapshots_immutable_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.mrm_report_snapshots
FOR EACH ROW EXECUTE FUNCTION public.reject_finalized_mrm_report_change();

COMMIT;