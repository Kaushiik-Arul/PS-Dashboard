BEGIN;
CREATE TABLE public.pool_register_state (
  kind TEXT PRIMARY KEY CHECK (kind IN ('development', 'talent')),
  revision BIGINT NOT NULL DEFAULT 0
);
INSERT INTO public.pool_register_state (kind) VALUES ('development'), ('talent');
CREATE TABLE public.pool_register_imports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.pool_register_state(kind),
  file_name TEXT NOT NULL, file_hash TEXT NOT NULL,
  row_count INTEGER NOT NULL, replaced_rows INTEGER NOT NULL,
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.pool_register_rows (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.pool_register_state(kind),
  pers_no BIGINT NOT NULL CHECK (pers_no > 0),
  employee_name TEXT NOT NULL, ps_group TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '',
  department_feb TEXT NOT NULL DEFAULT '', range TEXT NOT NULL DEFAULT '', pool TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '', start_date DATE NOT NULL, end_date DATE NOT NULL,
  active_passive TEXT NOT NULL DEFAULT '',
  import_id UUID REFERENCES public.pool_register_imports(id),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, pers_no), CHECK (end_date >= start_date)
);
CREATE TABLE public.pool_register_previews (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.pool_register_state(kind),
  base_revision BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);
CREATE TABLE public.pool_register_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.pool_register_previews(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 1),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  issues JSONB NOT NULL DEFAULT '[]'::JSONB,
  PRIMARY KEY(preview_id, row_number)
);
CREATE INDEX pool_register_previews_expiry_idx ON public.pool_register_previews(expires_at);
COMMIT;
-- Optional cleanup: DELETE FROM public.pool_register_previews WHERE expires_at < CURRENT_TIMESTAMP;
