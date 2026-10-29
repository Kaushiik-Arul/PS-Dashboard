BEGIN;

ALTER TABLE public.succession_planning_rows
  DROP CONSTRAINT IF EXISTS succession_planning_rows_incumbent_pers_no_check,
  DROP CONSTRAINT IF EXISTS succession_planning_rows_successor1_pers_no_check,
  DROP CONSTRAINT IF EXISTS succession_planning_rows_successor2_pers_no_check,
  DROP CONSTRAINT IF EXISTS succession_planning_rows_incumbent_age_check,
  DROP CONSTRAINT IF EXISTS succession_planning_rows_incumbent_change_year_check;

ALTER TABLE public.succession_planning_rows
  ALTER COLUMN incumbent_pers_no TYPE TEXT
    USING COALESCE(incumbent_pers_no::TEXT, ''),
  ALTER COLUMN incumbent_pers_no SET DEFAULT '',
  ALTER COLUMN incumbent_pers_no SET NOT NULL,
  ALTER COLUMN successor1_pers_no TYPE TEXT
    USING COALESCE(successor1_pers_no::TEXT, ''),
  ALTER COLUMN successor1_pers_no SET DEFAULT '',
  ALTER COLUMN successor1_pers_no SET NOT NULL,
  ALTER COLUMN successor2_pers_no TYPE TEXT
    USING COALESCE(successor2_pers_no::TEXT, ''),
  ALTER COLUMN successor2_pers_no SET DEFAULT '',
  ALTER COLUMN successor2_pers_no SET NOT NULL,
  ALTER COLUMN incumbent_tenure_years TYPE TEXT
    USING COALESCE(incumbent_tenure_years::TEXT, ''),
  ALTER COLUMN incumbent_tenure_years SET DEFAULT '',
  ALTER COLUMN incumbent_tenure_years SET NOT NULL,
  ALTER COLUMN incumbent_age TYPE TEXT
    USING COALESCE(incumbent_age::TEXT, ''),
  ALTER COLUMN incumbent_age SET DEFAULT '',
  ALTER COLUMN incumbent_age SET NOT NULL,
  ALTER COLUMN incumbent_change_year TYPE TEXT
    USING COALESCE(incumbent_change_year::TEXT, ''),
  ALTER COLUMN incumbent_change_year SET DEFAULT '',
  ALTER COLUMN incumbent_change_year SET NOT NULL;

COMMIT;