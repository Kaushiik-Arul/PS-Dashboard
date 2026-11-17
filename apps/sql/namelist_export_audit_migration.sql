BEGIN;

CREATE TABLE IF NOT EXISTS public.namelist_exports (
  id BIGSERIAL PRIMARY KEY,
  reporting_month DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('live', 'historical')),
  selected_columns JSONB NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash CHAR(64) NOT NULL CHECK (file_hash ~ '^[0-9a-f]{64}$'),
  exported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT namelist_exports_reporting_month_first_day
    CHECK (reporting_month = DATE_TRUNC('month', reporting_month)::date),
  CONSTRAINT namelist_exports_selected_columns_array
    CHECK (JSONB_TYPEOF(selected_columns) = 'array' AND JSONB_ARRAY_LENGTH(selected_columns) > 0)
);

CREATE INDEX IF NOT EXISTS idx_namelist_exports_month_time
  ON public.namelist_exports (reporting_month DESC, exported_at DESC);

CREATE INDEX IF NOT EXISTS idx_namelist_exports_actor_time
  ON public.namelist_exports (exported_by, exported_at DESC);

COMMIT;