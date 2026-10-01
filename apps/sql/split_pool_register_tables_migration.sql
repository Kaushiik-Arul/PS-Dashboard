BEGIN;

CREATE TABLE public.development_pool_register (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  employee_no BIGINT NOT NULL CHECK (employee_no > 0),
  employee_name TEXT NOT NULL,
  current_group TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  department_feb TEXT NOT NULL DEFAULT '',
  range TEXT NOT NULL DEFAULT '',
  development_pool TEXT NOT NULL,
  pool_start_date DATE NOT NULL,
  pool_end_date DATE NOT NULL,
  import_id UUID REFERENCES public.pool_register_imports(id),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_no),
  CHECK (pool_end_date >= pool_start_date)
);

CREATE INDEX development_pool_register_category_idx
  ON public.development_pool_register(development_pool);
CREATE INDEX development_pool_register_end_date_idx
  ON public.development_pool_register(pool_end_date);

CREATE TABLE public.talent_pool_register (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  pers_no BIGINT NOT NULL CHECK (pers_no > 0),
  employee_name TEXT NOT NULL,
  current_group TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  range TEXT NOT NULL DEFAULT '',
  talent_pool TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  active_passive TEXT NOT NULL,
  import_id UUID REFERENCES public.pool_register_imports(id),
  updated_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pers_no),
  CHECK (to_date >= from_date),
  CHECK (LOWER(BTRIM(active_passive)) IN ('active', 'passive'))
);

CREATE INDEX talent_pool_register_status_idx
  ON public.talent_pool_register(active_passive);
CREATE INDEX talent_pool_register_to_date_idx
  ON public.talent_pool_register(to_date);

INSERT INTO public.development_pool_register (
  id, employee_no, employee_name, current_group, department,
  department_feb, range, development_pool, pool_start_date, pool_end_date,
  import_id, updated_by, updated_at
)
SELECT
  id, pers_no, employee_name, ps_group, department,
  department_feb, range, pool, start_date, end_date,
  import_id, updated_by, updated_at
FROM public.pool_register_rows
WHERE kind = 'development';

INSERT INTO public.talent_pool_register (
  id, pers_no, employee_name, current_group, department,
  range, talent_pool, gender, from_date, to_date, active_passive,
  import_id, updated_by, updated_at
)
SELECT
  id, pers_no, employee_name, ps_group, department,
  range, pool, gender, start_date, end_date, active_passive,
  import_id, updated_by, updated_at
FROM public.pool_register_rows
WHERE kind = 'talent';

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.pool_register_rows WHERE kind = 'development')
      <> (SELECT COUNT(*) FROM public.development_pool_register) THEN
    RAISE EXCEPTION 'Development Pool Register row count does not match after migration';
  END IF;

  IF (SELECT COUNT(*) FROM public.pool_register_rows WHERE kind = 'talent')
      <> (SELECT COUNT(*) FROM public.talent_pool_register) THEN
    RAISE EXCEPTION 'Talent Pool Register row count does not match after migration';
  END IF;
END;
$$;

DROP TABLE public.pool_register_rows;

COMMIT;