BEGIN;

ALTER TABLE public.succession_planning_rows
  ALTER COLUMN incumbent_pers_no DROP NOT NULL;

COMMIT;