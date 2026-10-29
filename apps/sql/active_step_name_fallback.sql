-- Run once on databases where active_step_migration.sql has already been applied.
ALTER TABLE public.active_step_rows ADD COLUMN IF NOT EXISTS e_name TEXT;
