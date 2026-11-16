BEGIN;

ALTER TABLE public.employee_attrition_events
  ADD COLUMN employee_name TEXT
    CHECK (employee_name IS NULL OR CHAR_LENGTH(employee_name) <= 500);

ALTER TABLE public.attrition_departure_candidates
  ADD COLUMN employee_name TEXT
    CHECK (employee_name IS NULL OR CHAR_LENGTH(employee_name) <= 500);

COMMIT;