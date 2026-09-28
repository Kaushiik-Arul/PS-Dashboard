-- Run once before deploying the employee JD import warning change.
-- An employee row with a blank JD ID is retained with a NULL assignment.
-- The foreign key to job_descriptions continues to validate non-NULL JD IDs.
ALTER TABLE public.employee_jd_assignments
  ALTER COLUMN jd_id DROP NOT NULL;
