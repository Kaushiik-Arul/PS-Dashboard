BEGIN;

CREATE TABLE public.attrition_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  revision BIGINT NOT NULL DEFAULT 0
);

INSERT INTO public.attrition_state (singleton)
VALUES (TRUE);

CREATE TABLE public.attrition_imports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash TEXT NOT NULL CHECK (BTRIM(file_hash) <> ''),
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  replaced_rows INTEGER NOT NULL CHECK (replaced_rows >= 0),
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.attrition_rows (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  pers_no BIGINT NOT NULL CHECK (pers_no > 0),
  employee_name TEXT,
  ps_group TEXT,
  gender_key TEXT,
  filter_value TEXT,
  reason_for_action TEXT,
  detailed_reason_approved TEXT,
  org_unit TEXT,
  range TEXT,
  initiated_date_raw TEXT,
  initiated_date DATE,
  lwd_raw TEXT,
  lwd DATE,
  e_separation_request_no TEXT,
  to_org_unit TEXT,
  import_id UUID NOT NULL REFERENCES public.attrition_imports(id) ON DELETE RESTRICT,
  updated_by_account_id UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX attrition_rows_pers_no_idx
  ON public.attrition_rows (pers_no);
CREATE INDEX attrition_rows_lwd_idx
  ON public.attrition_rows (lwd)
  WHERE lwd IS NOT NULL;
CREATE INDEX attrition_rows_range_lwd_idx
  ON public.attrition_rows (range, lwd)
  WHERE range IS NOT NULL AND lwd IS NOT NULL;
CREATE INDEX attrition_rows_org_unit_lwd_idx
  ON public.attrition_rows (org_unit, lwd)
  WHERE org_unit IS NOT NULL AND lwd IS NOT NULL;
CREATE INDEX attrition_rows_reason_idx
  ON public.attrition_rows (reason_for_action)
  WHERE reason_for_action IS NOT NULL;

CREATE TABLE public.attrition_previews (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  base_revision BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash TEXT NOT NULL CHECK (BTRIM(file_hash) <> ''),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE TABLE public.attrition_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.attrition_previews(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  issues JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (JSONB_TYPEOF(issues) = 'array'),
  PRIMARY KEY (preview_id, row_number)
);

CREATE INDEX attrition_previews_expiry_idx
  ON public.attrition_previews (expires_at);

COMMIT;

-- Optional cleanup:
-- DELETE FROM public.attrition_previews WHERE expires_at < CURRENT_TIMESTAMP;