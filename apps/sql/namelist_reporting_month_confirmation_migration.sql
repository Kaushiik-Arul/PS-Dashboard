BEGIN;

ALTER TABLE public.namelist_imports
  ADD COLUMN IF NOT EXISTS reporting_month_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;