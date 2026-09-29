BEGIN;
CREATE TABLE public.available_talent_state (
  kind TEXT PRIMARY KEY CHECK (kind = 'available'),
  revision BIGINT NOT NULL DEFAULT 0
);
INSERT INTO public.available_talent_state (kind) VALUES ('available');
CREATE TABLE public.available_talent_imports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.available_talent_state(kind),
  file_name TEXT NOT NULL, file_hash TEXT NOT NULL,
  row_count INTEGER NOT NULL, replaced_rows INTEGER NOT NULL,
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.available_talent_rows (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.available_talent_state(kind),
  pers_no BIGINT NOT NULL CHECK (pers_no > 0),
  employee_name TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '',
  hrbp TEXT NOT NULL DEFAULT '', preferences TEXT NOT NULL DEFAULT '', current_status TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '', jd_id TEXT NOT NULL DEFAULT '',
  import_id UUID REFERENCES public.available_talent_imports(id),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, pers_no)
);
CREATE TABLE public.available_talent_previews (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  kind TEXT NOT NULL REFERENCES public.available_talent_state(kind),
  base_revision BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);
CREATE TABLE public.available_talent_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.available_talent_previews(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 1),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  issues JSONB NOT NULL DEFAULT '[]'::JSONB,
  PRIMARY KEY(preview_id, row_number)
);
CREATE INDEX available_talent_previews_expiry_idx ON public.available_talent_previews(expires_at);
COMMIT;
-- Optional cleanup: DELETE FROM public.available_talent_previews WHERE expires_at < CURRENT_TIMESTAMP;
