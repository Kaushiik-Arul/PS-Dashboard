BEGIN;

DELETE FROM public.attrition_departure_candidates;
DELETE FROM public.employee_attrition_events;
DELETE FROM public.attrition_tracking_runs;
DELETE FROM public.ps_exit_preview_rows;
DELETE FROM public.ps_exit_previews;
DELETE FROM public.ps_exit_rows;
DELETE FROM public.ps_exit_imports;
DELETE FROM public.employee_career_journey;
DELETE FROM public.rbin_staging_exports;
DELETE FROM public.rbin_staging_rows;
DELETE FROM public.rbin_staging_batches;
DELETE FROM public.rbin_namelist;
DELETE FROM public.rbin_namelist_history;
DELETE FROM public.rbin_namelist_imports;

COMMIT;

SELECT 'attrition_departure_candidates' AS table_name, COUNT(*) AS remaining_rows
FROM public.attrition_departure_candidates
UNION ALL
SELECT 'employee_attrition_events', COUNT(*) FROM public.employee_attrition_events
UNION ALL
SELECT 'attrition_tracking_runs', COUNT(*) FROM public.attrition_tracking_runs
UNION ALL
SELECT 'ps_exit_preview_rows', COUNT(*) FROM public.ps_exit_preview_rows
UNION ALL
SELECT 'ps_exit_previews', COUNT(*) FROM public.ps_exit_previews
UNION ALL
SELECT 'ps_exit_rows', COUNT(*) FROM public.ps_exit_rows
UNION ALL
SELECT 'ps_exit_imports', COUNT(*) FROM public.ps_exit_imports
UNION ALL
SELECT 'employee_career_journey', COUNT(*)
FROM public.employee_career_journey
UNION ALL
SELECT 'rbin_staging_exports', COUNT(*) FROM public.rbin_staging_exports
UNION ALL
SELECT 'rbin_staging_rows', COUNT(*) FROM public.rbin_staging_rows
UNION ALL
SELECT 'rbin_staging_batches', COUNT(*) FROM public.rbin_staging_batches
UNION ALL
SELECT 'rbin_namelist', COUNT(*) FROM public.rbin_namelist
UNION ALL
SELECT 'rbin_namelist_history', COUNT(*) FROM public.rbin_namelist_history
UNION ALL
SELECT 'rbin_namelist_imports', COUNT(*) FROM public.rbin_namelist_imports
ORDER BY table_name;