BEGIN;

CREATE TABLE public.employee_headcount_by_org_unit (
  reporting_month DATE NOT NULL
    REFERENCES public.employee_headcount_months(reporting_month) ON DELETE CASCADE,
  org_unit_key TEXT NOT NULL CHECK (
    BTRIM(org_unit_key) <> ''
    AND org_unit_key = UPPER(REGEXP_REPLACE(BTRIM(org_unit_key), '[[:space:]]+', ' ', 'g'))
  ),
  org_unit_name TEXT NOT NULL CHECK (
    BTRIM(org_unit_name) <> ''
    AND org_unit_name = REGEXP_REPLACE(BTRIM(org_unit_name), '[[:space:]]+', ' ', 'g')
  ),
  headcount INTEGER NOT NULL CHECK (headcount >= 0),
  PRIMARY KEY (reporting_month, org_unit_key)
);

CREATE INDEX employee_headcount_by_org_unit_key_idx
  ON public.employee_headcount_by_org_unit (org_unit_key, reporting_month);

CREATE TABLE public.employee_headcount_by_range_org_unit (
  reporting_month DATE NOT NULL
    REFERENCES public.employee_headcount_months(reporting_month) ON DELETE CASCADE,
  range_key TEXT NOT NULL CHECK (
    BTRIM(range_key) <> ''
    AND range_key = UPPER(REGEXP_REPLACE(BTRIM(range_key), '[[:space:]]+', ' ', 'g'))
  ),
  org_unit_key TEXT NOT NULL CHECK (
    BTRIM(org_unit_key) <> ''
    AND org_unit_key = UPPER(REGEXP_REPLACE(BTRIM(org_unit_key), '[[:space:]]+', ' ', 'g'))
  ),
  range_name TEXT NOT NULL CHECK (
    BTRIM(range_name) <> ''
    AND range_name = REGEXP_REPLACE(BTRIM(range_name), '[[:space:]]+', ' ', 'g')
  ),
  org_unit_name TEXT NOT NULL CHECK (
    BTRIM(org_unit_name) <> ''
    AND org_unit_name = REGEXP_REPLACE(BTRIM(org_unit_name), '[[:space:]]+', ' ', 'g')
  ),
  headcount INTEGER NOT NULL CHECK (headcount >= 0),
  PRIMARY KEY (reporting_month, range_key, org_unit_key)
);

CREATE INDEX employee_headcount_by_range_org_unit_range_idx
  ON public.employee_headcount_by_range_org_unit (range_key, reporting_month);
CREATE INDEX employee_headcount_by_range_org_unit_org_idx
  ON public.employee_headcount_by_range_org_unit (org_unit_key, reporting_month);
CREATE INDEX employee_headcount_by_range_org_unit_lookup_idx
  ON public.employee_headcount_by_range_org_unit (range_key, org_unit_key, reporting_month);

COMMIT;