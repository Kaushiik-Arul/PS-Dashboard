BEGIN;

ALTER TABLE public.employee_jd_imports
    ADD COLUMN IF NOT EXISTS reporting_month DATE;

UPDATE public.employee_jd_imports
SET reporting_month = DATE_TRUNC('month', created_at)::DATE
WHERE reporting_month IS NULL;

ALTER TABLE public.employee_jd_imports
    ALTER COLUMN reporting_month SET NOT NULL;

ALTER TABLE public.employee_jd_imports
    DROP CONSTRAINT IF EXISTS employee_jd_imports_reporting_month_check,
    ADD CONSTRAINT employee_jd_imports_reporting_month_check
        CHECK (EXTRACT(DAY FROM reporting_month) = 1);

ALTER TABLE public.employee_jd_import_previews
    ADD COLUMN IF NOT EXISTS reporting_month DATE;

UPDATE public.employee_jd_import_previews
SET reporting_month = DATE_TRUNC('month', created_at)::DATE
WHERE reporting_month IS NULL;

ALTER TABLE public.employee_jd_import_previews
    ALTER COLUMN reporting_month SET NOT NULL;

ALTER TABLE public.employee_jd_import_previews
    DROP CONSTRAINT IF EXISTS employee_jd_import_previews_reporting_month_check,
    ADD CONSTRAINT employee_jd_import_previews_reporting_month_check
        CHECK (EXTRACT(DAY FROM reporting_month) = 1);

CREATE INDEX IF NOT EXISTS employee_jd_imports_reporting_month_idx
    ON public.employee_jd_imports (reporting_month DESC, created_at DESC);

COMMIT;