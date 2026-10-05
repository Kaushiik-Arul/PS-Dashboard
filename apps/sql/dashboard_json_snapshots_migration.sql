BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_json_snapshots (
  id BIGSERIAL PRIMARY KEY,
  dashboard_key TEXT NOT NULL,
  reporting_month DATE NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  checksum TEXT NOT NULL,
  source_import_id BIGINT REFERENCES public.namelist_imports(id),
  created_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dashboard_json_snapshots_month_start_check
    CHECK (reporting_month = DATE_TRUNC('month', reporting_month)::date),
  CONSTRAINT dashboard_json_snapshots_version_check CHECK (version > 0),
  CONSTRAINT dashboard_json_snapshots_payload_object_check
    CHECK (JSONB_TYPEOF(payload) = 'object'),
  CONSTRAINT dashboard_json_snapshots_checksum_check
    CHECK (checksum = MD5(payload::text)),
  CONSTRAINT dashboard_json_snapshots_identity_unique
    UNIQUE (dashboard_key, reporting_month, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_json_snapshots_active_unique
  ON public.dashboard_json_snapshots (dashboard_key, reporting_month)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS dashboard_json_snapshots_lookup_idx
  ON public.dashboard_json_snapshots (dashboard_key, reporting_month DESC, is_active);

COMMIT;
