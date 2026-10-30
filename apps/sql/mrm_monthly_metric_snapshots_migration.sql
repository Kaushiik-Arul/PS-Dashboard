BEGIN;

CREATE TABLE IF NOT EXISTS public.mrm_monthly_snapshots (
  data_month DATE PRIMARY KEY
    CHECK (data_month = DATE_TRUNC('month', data_month)::DATE),
  source_import_id BIGINT REFERENCES public.namelist_imports(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.auth_accounts(account_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.mrm_monthly_metric_snapshots (
  data_month DATE NOT NULL
    REFERENCES public.mrm_monthly_snapshots(data_month) ON DELETE CASCADE,
  metric_key TEXT NOT NULL CHECK (BTRIM(metric_key) <> ''),
  range_key TEXT NOT NULL DEFAULT '',
  org_unit_key TEXT NOT NULL DEFAULT '',
  numerator NUMERIC NOT NULL,
  denominator NUMERIC,
  quality_count BIGINT NOT NULL DEFAULT 0 CHECK (quality_count >= 0),
  PRIMARY KEY (data_month, metric_key, range_key, org_unit_key),
  CONSTRAINT mrm_monthly_metric_snapshots_denominator_check
    CHECK (denominator IS NULL OR denominator >= 0)
);

CREATE INDEX IF NOT EXISTS mrm_monthly_metric_snapshots_scope_idx
  ON public.mrm_monthly_metric_snapshots (
    data_month, metric_key, range_key, org_unit_key
  );

ALTER TABLE public.mrm_metric_snapshots
  ADD COLUMN IF NOT EXISTS data_month DATE;

ALTER TABLE public.mrm_metric_snapshots
  DISABLE TRIGGER mrm_metric_snapshots_immutable_trigger;

UPDATE public.mrm_metric_snapshots bucket
SET data_month = report.data_month
FROM public.mrm_reports report
WHERE report.id = bucket.report_id
  AND bucket.data_month IS NULL;

ALTER TABLE public.mrm_metric_snapshots
  ENABLE TRIGGER mrm_metric_snapshots_immutable_trigger;

ALTER TABLE public.mrm_metric_snapshots
  ALTER COLUMN data_month SET NOT NULL;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT constraint_record.conname
  INTO constraint_name
  FROM pg_constraint constraint_record
  WHERE constraint_record.conrelid = 'public.mrm_metric_snapshots'::regclass
    AND constraint_record.contype = 'u'
    AND ARRAY(
      SELECT attribute.attname::TEXT
      FROM UNNEST(constraint_record.conkey) WITH ORDINALITY AS key(attnum, position)
      JOIN pg_attribute attribute
        ON attribute.attrelid = constraint_record.conrelid
       AND attribute.attnum = key.attnum
      ORDER BY key.position
    ) = ARRAY['report_id', 'metric_key', 'range_key', 'org_unit_key'];

  IF constraint_name IS NOT NULL THEN
    EXECUTE FORMAT(
      'ALTER TABLE public.mrm_metric_snapshots DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END;
$$;

ALTER TABLE public.mrm_metric_snapshots
  DROP CONSTRAINT IF EXISTS mrm_metric_snapshots_month_scope_unique;

ALTER TABLE public.mrm_metric_snapshots
  ADD CONSTRAINT mrm_metric_snapshots_month_scope_unique
  UNIQUE (report_id, data_month, metric_key, range_key, org_unit_key);

CREATE INDEX IF NOT EXISTS mrm_metric_snapshots_report_month_scope_idx
  ON public.mrm_metric_snapshots (
    report_id, data_month, metric_key, range_key, org_unit_key
  );

COMMIT;