BEGIN;

CREATE TABLE public.nomination_status_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  revision BIGINT NOT NULL DEFAULT 0
);

INSERT INTO public.nomination_status_state (singleton) VALUES (TRUE);

CREATE TABLE public.nomination_status_imports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  replaced_rows INTEGER NOT NULL CHECK (replaced_rows >= 0),
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.nomination_status_rows (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  year INTEGER NOT NULL CHECK (year BETWEEN 1000 AND 9999),
  corp_plant TEXT NOT NULL,
  range TEXT NOT NULL,
  department TEXT NOT NULL,
  employee_no BIGINT NOT NULL CHECK (employee_no > 0),
  employee_name TEXT NOT NULL,
  talent_pool TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('Cleared', 'Amber', 'Not Cleared')),
  admission TEXT NOT NULL,
  import_id UUID NOT NULL REFERENCES public.nomination_status_imports(id),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX nomination_status_rows_result_idx
  ON public.nomination_status_rows(result);
CREATE INDEX nomination_status_rows_employee_idx
  ON public.nomination_status_rows(employee_no);

CREATE TABLE public.nomination_status_previews (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  base_revision BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE TABLE public.nomination_status_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.nomination_status_previews(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 1),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  PRIMARY KEY (preview_id, row_number)
);

CREATE INDEX nomination_status_previews_expiry_idx
  ON public.nomination_status_previews(expires_at);

COMMIT;

-- Optional cleanup: DELETE FROM public.nomination_status_previews WHERE expires_at < CURRENT_TIMESTAMP;