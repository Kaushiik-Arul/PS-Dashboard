BEGIN;

DELETE FROM public.employee_career_journey;
DELETE FROM public.rbin_staging_exports;
DELETE FROM public.rbin_staging_rows;
DELETE FROM public.rbin_staging_batches;
DELETE FROM public.rbin_namelist;
DELETE FROM public.rbin_namelist_history;
DELETE FROM public.rbin_namelist_imports;

COMMIT;

SELECT 'employee_career_journey' AS table_name, COUNT(*) AS remaining_rows
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