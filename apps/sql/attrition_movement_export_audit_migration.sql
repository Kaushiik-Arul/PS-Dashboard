BEGIN;

CREATE TABLE IF NOT EXISTS public.attrition_movement_exports (
  export_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  exported_by_account_id UUID NOT NULL
    REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
  scope TEXT NOT NULL DEFAULT 'all_confirmed_history'
    CHECK (scope = 'all_confirmed_history'),
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash CHAR(64) NOT NULL CHECK (file_hash ~ '^[0-9a-f]{64}$'),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS attrition_movement_exports_actor_time_idx
  ON public.attrition_movement_exports (exported_by_account_id, exported_at DESC);

CREATE INDEX IF NOT EXISTS attrition_movement_exports_time_idx
  ON public.attrition_movement_exports (exported_at DESC);

COMMIT;