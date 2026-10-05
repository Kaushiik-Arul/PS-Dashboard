BEGIN;

CREATE TABLE public.succession_planning_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  revision BIGINT NOT NULL DEFAULT 0
);

INSERT INTO public.succession_planning_state (singleton)
VALUES (TRUE);

CREATE TABLE public.succession_planning_imports (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash TEXT NOT NULL CHECK (BTRIM(file_hash) <> ''),
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  replaced_rows INTEGER NOT NULL CHECK (replaced_rows >= 0),
  imported_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.succession_planning_rows (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  entity TEXT NOT NULL DEFAULT '',
  updated_by_name TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  position_jd_id TEXT NOT NULL,
  jd_name TEXT NOT NULL DEFAULT '',
  ipe_level TEXT NOT NULL DEFAULT '',
  employee_subgroup TEXT NOT NULL DEFAULT '',
  criticality TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT '',
  incumbent_pers_no TEXT NOT NULL DEFAULT '',
  incumbent_name TEXT NOT NULL,
  incumbent_org_unit TEXT NOT NULL DEFAULT '',
  incumbent_range TEXT NOT NULL DEFAULT '',
  incumbent_tenure_years TEXT NOT NULL DEFAULT '',
  incumbent_age TEXT NOT NULL DEFAULT '',
  incumbent_change_year TEXT NOT NULL DEFAULT '',
  incumbent_9_box_rating TEXT NOT NULL DEFAULT '',
  reason_for_change TEXT NOT NULL DEFAULT '',
  successor1_pers_no TEXT NOT NULL DEFAULT '',
  successor1_name TEXT NOT NULL DEFAULT '',
  successor1_dept_code TEXT NOT NULL DEFAULT '',
  successor1_current_jd_id TEXT NOT NULL DEFAULT '',
  successor1_readiness TEXT NOT NULL DEFAULT '',
  successor1_9_box_rating TEXT NOT NULL DEFAULT '',
  successor1_idp_status TEXT NOT NULL DEFAULT '',
  successor2_pers_no TEXT NOT NULL DEFAULT '',
  successor2_name TEXT NOT NULL DEFAULT '',
  successor2_dept_code TEXT NOT NULL DEFAULT '',
  successor2_current_jd_id TEXT NOT NULL DEFAULT '',
  successor2_readiness TEXT NOT NULL DEFAULT '',
  successor2_9_box_rating TEXT NOT NULL DEFAULT '',
  successor2_idp_status TEXT NOT NULL DEFAULT '',
  import_id UUID NOT NULL REFERENCES public.succession_planning_imports(id) ON DELETE RESTRICT,
  updated_by_account_id UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX succession_planning_rows_incumbent_idx
  ON public.succession_planning_rows (incumbent_pers_no);
CREATE INDEX succession_planning_rows_successor1_idx
  ON public.succession_planning_rows (successor1_pers_no)
  WHERE successor1_pers_no <> '';
CREATE INDEX succession_planning_rows_successor2_idx
  ON public.succession_planning_rows (successor2_pers_no)
  WHERE successor2_pers_no <> '';

CREATE TABLE public.succession_planning_previews (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  base_revision BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
  file_hash TEXT NOT NULL CHECK (BTRIM(file_hash) <> ''),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE TABLE public.succession_planning_preview_rows (
  preview_id UUID NOT NULL REFERENCES public.succession_planning_previews(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  row_data JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
  issues JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (JSONB_TYPEOF(issues) = 'array'),
  PRIMARY KEY (preview_id, row_number)
);

CREATE INDEX succession_planning_previews_expiry_idx
  ON public.succession_planning_previews (expires_at);

COMMIT;

-- Optional cleanup:
-- DELETE FROM public.succession_planning_previews WHERE expires_at < CURRENT_TIMESTAMP;
