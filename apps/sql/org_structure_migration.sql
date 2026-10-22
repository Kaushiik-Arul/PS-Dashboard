BEGIN;

CREATE TABLE public.org_structure_imports (
  import_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
  row_count INTEGER NOT NULL CHECK (row_count BETWEEN 1 AND 25000),
  replaced_rows INTEGER NOT NULL CHECK (replaced_rows >= 0),
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.org_structure_rows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.org_structure_imports(import_id) ON DELETE RESTRICT,
  source_row_number INTEGER NOT NULL,
  role_title TEXT NOT NULL,
  reporting_to TEXT NOT NULL DEFAULT '',
  jd_id TEXT NOT NULL DEFAULT '',
  career_level TEXT NOT NULL DEFAULT '',
  layer TEXT NOT NULL DEFAULT '',
  order_by INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (import_id, source_row_number)
);
CREATE INDEX org_structure_rows_parent_idx ON public.org_structure_rows (LOWER(BTRIM(reporting_to)));
CREATE INDEX org_structure_rows_active_idx ON public.org_structure_rows (is_active, order_by, role_title);

CREATE TABLE public.org_structure_previews (
  preview_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
  total_rows INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);
CREATE INDEX org_structure_previews_expiry_idx ON public.org_structure_previews (expires_at) WHERE status = 'ready';

CREATE TABLE public.org_structure_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.org_structure_previews(preview_id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 1),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  PRIMARY KEY (preview_id, row_number)
);

COMMIT;
-- Optional scheduled cleanup: DELETE FROM public.org_structure_previews WHERE expires_at < CURRENT_TIMESTAMP;