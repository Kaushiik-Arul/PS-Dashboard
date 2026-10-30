BEGIN;

ALTER TABLE public.mrm_row_definitions
  ADD COLUMN IF NOT EXISTS table_key TEXT;

ALTER TABLE public.mrm_row_definitions
  ADD COLUMN IF NOT EXISTS metric_key TEXT;

UPDATE public.mrm_row_definitions
SET table_key = 'ps-in'
WHERE table_key IS NULL;

UPDATE public.mrm_row_definitions
SET metric_key = row_key
WHERE value_mode = 'calculated'
  AND metric_key IS NULL;

ALTER TABLE public.mrm_row_definitions
  ALTER COLUMN table_key SET DEFAULT 'ps-in',
  ALTER COLUMN table_key SET NOT NULL;

ALTER TABLE public.mrm_row_definitions
  DROP CONSTRAINT IF EXISTS mrm_row_definitions_table_key_check;

ALTER TABLE public.mrm_row_definitions
  ADD CONSTRAINT mrm_row_definitions_table_key_check
  CHECK (table_key ~ '^[a-z0-9][a-z0-9-]{0,99}$');

ALTER TABLE public.mrm_row_definitions
  DROP CONSTRAINT IF EXISTS mrm_row_definitions_metric_key_check;

ALTER TABLE public.mrm_row_definitions
  ADD CONSTRAINT mrm_row_definitions_metric_key_check
  CHECK (
    (value_mode = 'manual' AND metric_key IS NULL)
    OR (value_mode = 'calculated' AND metric_key IS NOT NULL AND BTRIM(metric_key) <> '')
  );

UPDATE public.mrm_row_definitions
SET display_order = CASE row_key
  WHEN 'hiring' THEN 0
  WHEN 'expat' THEN 1
  WHEN 'attrition' THEN 2
  WHEN 'rotation' THEN 3
  WHEN 'transfer' THEN 4
  WHEN 'sul' THEN 5
  WHEN 'women-slx' THEN 6
  WHEN 'women-hc' THEN 7
  WHEN 'gender-hiring' THEN 8
  WHEN 'succession' THEN 9
  WHEN 'pul' THEN 10
  WHEN 'indirect-mss' THEN 11
  WHEN 'direct-mss' THEN 12
  WHEN 'total-mss' THEN 13
  WHEN 'workforce-outside-pul' THEN 14
  WHEN 'esp-wc-napsgre' THEN 15
  WHEN 'esp-bca' THEN 16
  WHEN 'ga-ma' THEN 17
  WHEN 'pcd-direct-hc' THEN 18
  WHEN 'permanent' THEN 19
  WHEN 'temporary' THEN 20
  ELSE display_order
END
WHERE table_key = 'ps-in';

INSERT INTO public.mrm_row_definitions (
  row_key, table_key, metric_key, title, description, value_mode,
  display_order, highlighted, muted, emphasized, active_from_month, managed
)
VALUES
  ('corp-pul', 'ps-corp', NULL, 'PUL', '', 'manual', 0, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-hiring', 'ps-corp', NULL, 'Hiring performance (WC)', 'Turn around time - Job Ad to offer date', 'manual', 1, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-expat', 'ps-corp', 'expat', 'Expat', '1% of PUL26', 'calculated', 2, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-attrition', 'ps-corp', 'attrition', 'Attrition', 'Exit from organization', 'calculated', 3, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-rotation', 'ps-corp', 'rotation', 'Job Rotation', 't/o Transfer within Bosch', 'calculated', 4, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-transfer', 'ps-corp', 'transfer', 't/o Transfer within plant / within Corp', '', 'calculated', 5, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-sul', 'ps-corp', 'sul', 'SUL', '', 'calculated', 6, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-women-slx', 'ps-corp', 'women-slx', 'Women in SLx', '', 'calculated', 7, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-women-hc', 'ps-corp', 'women-hc', '% Women in overall HC (M&SS)', '', 'calculated', 8, FALSE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-gender-hiring', 'ps-corp', 'gender-hiring', 'Gender Diversity Hiring', '', 'calculated', 9, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE),
  ('corp-succession', 'ps-corp', NULL, 'Succession Planning Coverage (SLx)', '', 'manual', 10, TRUE, FALSE, TRUE, DATE '2025-01-01', TRUE)
ON CONFLICT (row_key) DO UPDATE SET
  table_key = EXCLUDED.table_key,
  metric_key = EXCLUDED.metric_key,
  display_order = EXCLUDED.display_order;

DROP INDEX IF EXISTS public.mrm_row_definitions_active_idx;

CREATE INDEX mrm_row_definitions_active_idx
  ON public.mrm_row_definitions (
    active_from_month, active_to_month, table_key, display_order
  );

COMMIT;
