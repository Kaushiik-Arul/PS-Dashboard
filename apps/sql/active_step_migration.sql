BEGIN;

CREATE TABLE public.active_step_imports (
  import_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
  row_count INTEGER NOT NULL CHECK (row_count BETWEEN 1 AND 25000),
  replaced_rows INTEGER NOT NULL CHECK (replaced_rows >= 0),
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.active_step_rows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.active_step_imports(import_id) ON DELETE RESTRICT,
  source_row_number INTEGER NOT NULL,
  sl_no TEXT,
  year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 9999),
  pers_no BIGINT NOT NULL CHECK (pers_no > 0),
  e_name TEXT,
  grp TEXT,
  initiated_by TEXT,
  exchanged_with TEXT,
  step_from DATE NOT NULL,
  step_to DATE,
  entity_from TEXT,
  entity_to TEXT,
  gb_from TEXT,
  gb_to TEXT,
  function_from TEXT,
  function_to TEXT,
  dept_from TEXT,
  dept_to TEXT,
  location_from TEXT,
  location_to TEXT,
  UNIQUE (import_id, source_row_number),
  CHECK (step_to IS NULL OR step_to >= step_from)
);
CREATE INDEX active_step_rows_pers_no_idx ON public.active_step_rows (pers_no);
CREATE INDEX active_step_rows_year_idx ON public.active_step_rows (year DESC);

CREATE TABLE public.active_step_previews (
  preview_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
  total_rows INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
  valid_rows INTEGER NOT NULL CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL CHECK (invalid_rows >= 0),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  CHECK (valid_rows + invalid_rows = total_rows)
);
CREATE INDEX active_step_previews_expiry_idx ON public.active_step_previews (expires_at) WHERE status = 'ready';

CREATE TABLE public.active_step_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.active_step_previews(preview_id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 1),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  issues JSONB NOT NULL CHECK (JSONB_TYPEOF(issues) = 'array'),
  is_valid BOOLEAN NOT NULL,
  PRIMARY KEY (preview_id, row_number)
);
CREATE INDEX active_step_preview_rows_filter_idx ON public.active_step_preview_rows (preview_id, is_valid, row_number);

COMMIT;
-- Optional scheduled cleanup: DELETE FROM public.active_step_previews WHERE expires_at < CURRENT_TIMESTAMP;
