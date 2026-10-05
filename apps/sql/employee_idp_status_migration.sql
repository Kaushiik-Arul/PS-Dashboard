BEGIN;

CREATE TABLE public.employee_idp_status (
  pers_no BIGINT PRIMARY KEY CHECK (pers_no > 0),
  comments TEXT NOT NULL DEFAULT '',
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;