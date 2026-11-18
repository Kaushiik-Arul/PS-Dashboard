BEGIN;

ALTER TABLE public.org_unit_range_mappings
  ADD COLUMN IF NOT EXISTS range_2 TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_unit_range_mappings_range_2_nonblank_check'
      AND conrelid = 'public.org_unit_range_mappings'::regclass
  ) THEN
    ALTER TABLE public.org_unit_range_mappings
      ADD CONSTRAINT org_unit_range_mappings_range_2_nonblank_check
      CHECK (range_2 IS NULL OR NULLIF(BTRIM(range_2), '') IS NOT NULL);
  END IF;
END
$$;

COMMIT;
