\set ON_ERROR_STOP on

-- Run with psql. Every path is resolved relative to this file.
-- This bootstrap is only for an empty database; it intentionally excludes
-- legacy upgrade and destructive reset migrations.

-- Core identity and employee data.
\ir auth_creation.sql
\ir namelist_creation.sql
\ir employee_LeaveStatus_creation.sql

-- Namelist import and reporting history.
\ir namelist_import_staging_migration.sql
\ir namelist_monthly_history_migration.sql
\ir namelist_reporting_month_confirmation_migration.sql

-- Fresh RBIN schema. This already contains Career Journey, current/history
-- snapshots, mappings, employee exceptions, staging, and export tables.
\ir rbin_namelist_creation.sql

-- Reference data and operational imports.
\ir org_structure_migration.sql
\ir org_structure_grade_function_migration.sql
\ir active_step_migration.sql
\ir active_step_name_fallback.sql
\ir attrition_import_migration.sql
\ir employee_headcount_import_migration.sql
\ir employee_headcount_org_unit_migration.sql
\ir employee_ppp_history_migration.sql
\ir employee_idp_status_migration.sql

-- Employee job descriptions.
\ir employee_jd_assignment_migration.sql
\ir employee_jd_allow_unassigned.sql
\ir employee_jd_reporting_month_migration.sql

-- Planning and talent registers.
\ir succession_planning_migration.sql
\ir succession_planning_allow_unassigned_incumbent.sql
\ir succession_planning_text_values_migration.sql
\ir available_talent_migration.sql
\ir pool_registers_migration.sql
\ir split_pool_register_tables_migration.sql
\ir nomination_status_migration.sql

-- Account preferences, historical dashboard snapshots, and MRM.
\ir account_dashboard_preferences_migration.sql
\ir dashboard_json_snapshots_migration.sql
\ir mrm_creation_migration.sql

-- Install the latest Overview and Talent Pipeline function definitions last.
\ir multi_select_dashboard_filters_migration.sql

\echo 'PS Dashboard database bootstrap completed successfully.'