# Overview database contract

API endpoint: GET /api/v1/overview

Source tables: public.employee_namelist, public.employee_namelist_monthly,
public.employee_status

| Function | Arguments | Return type | Purpose |
| --- | --- | --- | --- |
| public.get_workforce_kpis() | DATE, six optional TEXT filters, authenticated account UUID, optional reporting month | JSONB | Scope-filtered overview KPI values |
| public.get_workforce_charts() | DATE, six optional TEXT filters, authenticated account UUID, optional reporting month | JSONB | Scope-filtered overview chart data |

## Rules

- Both functions are read-only. Workforce KPIs and charts use
  employee_namelist for the current view and employee_namelist_monthly for a
  selected historical month.
- Date-based historical calculations use the selected calendar month's final
  day. Current calculations use CURRENT_DATE.
- Maternity, sabbatical, and CRL always use current employee_status records,
  including when a historical Namelist month is selected. The UI labels these
  cards as current status.
- Maternity, Sabbatical and CRL KPIs count every stored employee_status record
  within the viewer's authorized workforce scope, regardless of its start and
  end dates.
- Missing source data produces null/unavailable results, not invented values.
- The API returns an object containing kpis and charts.
- The functions return JSON objects, not formatted JSON text.
- These functions accept an optional calculation date and dashboard filters.
- Overview filters are optional exact matches for function, organizational unit,
  range, location, gender, and direct/indirect values after trimming whitespace.
- Every workforce query requires an authenticated account UUID. HRBP and Admin
  assignments can view all employees; Range Head assignments are limited to
  their Ranges; Department and Sub-department Head assignments are limited to
  their exact Range and Organizational Unit tuples. Multiple assignments form
  the union of those scopes, and dashboard filters may only narrow that union.
- Employee-status KPI filters join employee_status to the selected current or
  historical Namelist employee set by pers_no.
- Update this contract and the response DTOs when output fields change.
- Store function definitions in apps/sql/functions.
- Apply database changes through versioned migrations.

## Talent Pipeline database contract

| Function | Arguments | Return type | Purpose |
| --- | --- | --- | --- |
| `public.get_talent_pipeline_kpis()` | DATE, six optional TEXT filters, authenticated account UUID | JSONB | Scope-filtered Talent and Development Pool KPI values |
| `public.get_talent_pipeline_charts()` | DATE, six optional TEXT filters, authenticated account UUID | JSONB | Scope-filtered Talent Pipeline chart distributions |

The KPI function reads `talent_pool_register` for total, Active, Passive, and
To-date expiry counts. It reads `development_pool_register` for the total and
the Female Talent, Key to Retain, Future Talent, and Change Wanted categories.
The six dashboard filters and `master_access` authorization are evaluated using
the matching `employee_namelist` row.

The chart function returns Talent Pool, Active/Passive, Development Pool,
Talent gender, Talent range, and nomination RAG distributions. Nomination RAG
uses all rows in the current `nomination_status_rows` replacement snapshot and maps Cleared to Green,
Amber to Amber, and Not Cleared to Red. Current register tables are replacement
snapshots, so the functions do not return unsupported month-over-month trends.

HRBP users can select a previous reporting month and publish an unfiltered
monthly Talent Pipeline snapshot independently of Namelist imports. Publication
stores the existing KPI and chart function JSON in `dashboard_json_snapshots`
under the `talent-pipeline` key, versions same-month corrections, and verifies
its checksum in the same transaction. The month picker defaults to the previous
calendar month. Historical list/read/publish endpoints require
`dashboard-history:view`; other roles remain live-only. Historical mode disables
organizational filters and does not display current operational register tables.

Apply both functions after the Pool Register split and Nomination Status
migrations:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/talent_pipeline_functions_migration.sql"
```

## Authentication database contract

Schema file: `apps/sql/auth_creation.sql`

| Table | Purpose |
| --- | --- |
| `public.auth_accounts` | UUID account identity, optional personnel link, login email, Argon2id password hash, account state and lockout data |
| `public.master_access` | One or more role-and-scope assignments per account |
| `public.auth_sessions` | Hashed opaque browser sessions, expiry and revocation |
| `public.security_audit_log` | Append-only security event history |

### Access rules

- Supported roles are `hrbp`, `admin`, `range_head`, `department_head`, and
  `sub_department_head`.
- HRBP and Admin assignments have unrestricted employee scope, so
  `assigned_range` and `assigned_org_unit` are null.
- Range Head assignments require one Range and no Organizational Unit.
- Department Head and Sub-department Head assignments require one Range and one
  Organizational Unit. Additional coverage is represented by additional
  assignment rows, preventing accidental Range/Org Unit cross-products.
- Do not combine unrestricted HRBP or Admin access with scoped Head assignments
  on the same account.
- `account_id` is the internal UUID account key used by access, session and audit
  records.
- `pers_no` is an optional unique link to `employee_namelist`. It remains BIGINT
  when present but may be null for external HRBP accounts.
- Users log in with `login_email` and password. Login emails are stored trimmed
  and lowercase and must be unique.
- `display_name` and `login_email` are stored on the account because an external
  HRBP may not exist in `employee_namelist`. Employee-linked account values are
  initialized from the namelist and reviewed when imports change.
- Passwords are never stored directly. Only encoded Argon2id hashes are stored.
- The browser receives an opaque random session token. Only its SHA-256 hash is
  stored in `auth_sessions`.
- Password resets, account deactivation and role changes revoke all sessions for
  the affected account. Logout revokes only the current session.
- Audit details must never contain passwords, password hashes, raw session
  tokens or CSRF values.
- Do not apply `auth_creation.sql` more than once. After its initial application,
  evolve these tables through versioned migrations rather than editing and
  reapplying the creation script in shared environments.
- Databases created with the original personnel-number primary key must apply
  `auth_account_uuid_migration.sql` once before creating accounts without a
  personnel number.
- Existing UUID-based authentication databases must apply
  `access_point_multi_assignment_migration.sql` before deploying Access Point.
- After the multi-assignment migration, apply
  `overview_access_scope_migration.sql` before enabling Overview for Head roles.

## Namelist import

Full cross-stack documentation: [Namelist Updation](../../NAMELIST_IMPORT.md).

Apply `namelist_import_staging_migration.sql` after `auth_creation.sql` and
`namelist_creation.sql` before enabling Namelist Updation. It creates expiring,
account-owned preview data used between upload and confirmation requests.

The import accepts CSV and XLSX files with all 29 `employee_namelist` columns.
Column order may differ; header matching is case-insensitive and normalizes
spaces and hyphens to underscores. Every value is required except `function`,
which may be blank only when `employee_group` is `outbound`. Both live and
historical uploads require an explicit reporting month earlier than the current
calendar month. A successful Push replaces the complete `employee_namelist`
within one transaction.

Historical Namelist upload is a separate mode. It requires a previous
reporting month, reuses the same preview validation, and writes only to
`employee_namelist_monthly`. It never deletes or updates `employee_namelist`.
Re-importing a historical month replaces only that month's history rows.

Row-level retention covers three reporting months total: the current live month
plus the two newest detailed months. A newer live import first copies the
outgoing live rows into monthly detail. Older detail is converted to versioned,
HRBP-only Overview JSON, and checksum verification must succeed before its rows
are deleted in the same transaction.

Install the API parser dependencies after pulling this change:

```powershell
npm install --prefix apps/api
```

Apply the staging migration once:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/namelist_import_staging_migration.sql"
```

Apply monthly history and the refreshed Overview functions after the staging
migration:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/namelist_monthly_history_migration.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/namelist_reporting_month_confirmation_migration.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/functions/overview/get_workforce_overview_kpis.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/functions/overview/get_workforce_overview_charts.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/dashboard_json_snapshots_migration.sql"
```

Preview sessions expire after 24 hours. A scheduled cleanup may run:

```sql
DELETE FROM public.namelist_import_previews
WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;
```

## Employee PPP history

Apply `employee_ppp_history_migration.sql` after the authentication and
namelist schemas before enabling the PPP History Upload in HRBP Point:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/employee_ppp_history_migration.sql"
```

The upload accepts the fixed employee context columns plus Performance,
Position, Person, and TCL for the current year and two prior years. Header
years are validated against the server UTC year. A successful confirmed import
atomically replaces the complete normalized history dataset. Employee context
columns are preview-only; unknown personnel numbers are reported and skipped.

## Employee job descriptions

Apply `employee_jd_assignment_migration.sql` after the authentication, Namelist,
and Career Journey schemas before enabling Job Description Management:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/employee_jd_assignment_migration.sql"
```

The JD master maps JD IDs to Role Titles. Employee assignment uploads accept
one XLSX worksheet containing `Pers.No.` and `JDID`; unrelated source columns
are ignored. The preview validates employees and master JD IDs before an
explicitly confirmed transaction deletes and replaces all current assignments.
Added, changed, and removed assignments create permanent timestamped movements
with Role Title snapshots for Employee 360 and the HRBP movement tracker.

Preview sessions expire after 24 hours. A scheduled cleanup may run:

```sql
DELETE FROM public.employee_jd_import_previews
WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;
```

## RBIN cleaning data foundation

Full cross-stack documentation: [RBIN Namelist to PS Namelist](../../RBIN_NAMELIST_CLEANING.md).

`rbin_namelist_creation.sql` is the fresh-install schema for the RBIN cleaning
workflow. Apply it after `auth_creation.sql` and `namelist_creation.sql`. Do not
apply it to a database that already contains the preliminary RBIN tables.

Existing databases with the preliminary `rbin_namelist` and
`rbin_namelist_imports` tables must apply `rbin_cleaning_migration.sql` once:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/rbin_cleaning_migration.sql"
```

Back up the database before applying the migration. It intentionally stops if
a legacy `imported_by` value cannot be matched to an account UUID, personnel
number, or login email. It also stops if raw RBIN rows exist without an import
audit record. Correct those records and rerun the complete migration; its
transaction rolls back all partial changes after an error.

After the RBIN cleaning schema exists, apply the employee exception migration
once before deploying Employee Exceptions:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/rbin_employee_exceptions_migration.sql"
```

Apply the Career Journey migration after the RBIN cleaning and authentication
schemas. It retains raw RBIN snapshots and adds month-to-month employee history:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/employee_career_journey_migration.sql"
```

Apply the current-snapshot migration after the Career Journey migration. It
moves existing raw snapshots into dedicated history and leaves only the latest
uploaded file in `rbin_namelist`:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/rbin_current_snapshot_migration.sql"
```

For databases where the current-snapshot migration was already applied, add
the exact stored-row payload required by Save cleaned dataset:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/rbin_finalize_replacement_migration.sql"
```

The RBIN tables have separate retention semantics:

| Table | Retention and purpose |
| --- | --- |
| `rbin_namelist_imports` | Permanent audit record for every raw upload. |
| `rbin_namelist` | Current raw RBIN dataset; replaced atomically when Save cleaned dataset is confirmed. |
| `rbin_namelist_history` | Permanent raw JSON snapshots used for month-to-month Career Journey detection. |
| `org_unit_range_mappings` | Persistent Organizational Unit to Range lookup. |
| `org_unit_function_mappings` | Persistent Organizational Unit to Function lookup. |
| `rbin_employee_column_exceptions` | Persistent employee-and-column fixed values for future RBIN uploads. |
| `rbin_staging_batches` | Permanent transformed batch and validation counters. |
| `rbin_staging_rows` | Original and currently edited 29-column PS rows. |
| `rbin_staging_exports` | Permanent record of every XLSX download. |
| `employee_career_journey` | Permanent monthly PS-entry and internal PS-change history, including reviewed edits and soft-deleted tombstones. |

Career detection compares raw RBIN values by Pers.No before mappings,
exceptions, or PS staging filters. The first retained upload is a baseline.
Later uploads record proven non-PS to PS entries and PS Organizational Unit or
PS Group changes. Same-month reuploads compare against the prior month and
replace only unreviewed automatic events; HRBP edits and deletions are retained.

Select the source file's reporting month during every RBIN upload. To verify
historical detection, upload June 2026 first as the baseline, followed by July
2026 and August 2026. Do not clear `employee_namelist`; Employee 360 visibility
and workforce scope depend on those current employee records. Existing imports
from later reporting months do not affect comparisons for an earlier month.

Raw rows are keyed by import and source row rather than `pers_no`, allowing the
database to retain duplicate or malformed employee numbers for validation. The
raw JSONB value is authoritative; nullable typed columns support querying valid
values. Staging and export records have no expiry or automatic deletion.
RBIN cleaning requires both a Range and Function for every staged employee,
including Outbound employees. This is intentionally stricter than the existing
live Namelist Updation rule. A missing lookup makes the staged row invalid. The
preview must show a mapping alert summarizing every affected Organizational
Unit and whether Range, Function, or both were not found. The affected cells
remain editable; a manual correction applies only to that staged row and does
not change either mapping table.

### Load Organizational Unit mappings

The Range CSV must have the headers `organizational_unit,range`. The Function
CSV must have `organizational_unit,function`. Load each file in a separate
transaction using `psql`; replace the example paths and source file names.

The preferred loader validates both CSVs first, creates or migrates the RBIN
schema when needed, and transactionally upserts both mappings. Its defaults are
the approved local file paths:

```powershell
& .\infra\scripts\load-rbin-mappings.ps1
```

Override paths when the files move:

```powershell
& .\infra\scripts\load-rbin-mappings.ps1 `
  -FunctionCsv "C:\path\OrgUnit Function Mapping.csv" `
  -RangeCsv "C:\path\OrgUnit - Range Mapping.csv"
```

The script reads `DATABASE_URL` from `apps/api/.env` unless `-DatabaseUrl` is
provided. It recognizes `organizational_unit`, `organisational_unit`,
`org_unit`, or `orgunit` after normalizing spaces and punctuation. Range headers
may be `range` or `range_value`; Function headers may be `function` or
`function_value`. Blank values and conflicting duplicate Organizational Units
stop the load before PostgreSQL is changed.

The following manual SQL is retained as a fallback.

Range mapping:

```sql
BEGIN;

CREATE TEMP TABLE range_mapping_load (
  organizational_unit TEXT,
  range_value TEXT
) ON COMMIT DROP;

\copy range_mapping_load (organizational_unit, range_value) FROM 'C:/approved/org-unit-range.csv' WITH (FORMAT csv, HEADER true)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM range_mapping_load
    WHERE NULLIF(BTRIM(organizational_unit), '') IS NULL
       OR NULLIF(BTRIM(range_value), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Range mapping contains a blank Organizational Unit or Range.';
  END IF;

  IF EXISTS (
    SELECT LOWER(BTRIM(organizational_unit))
    FROM range_mapping_load
    GROUP BY LOWER(BTRIM(organizational_unit))
    HAVING COUNT(DISTINCT BTRIM(range_value)) > 1
  ) THEN
    RAISE EXCEPTION 'Range mapping contains conflicting values for an Organizational Unit.';
  END IF;
END;
$$;

INSERT INTO public.org_unit_range_mappings (
  organizational_unit,
  range_value,
  source_file_name
)
SELECT MIN(BTRIM(organizational_unit)), MIN(BTRIM(range_value)), 'org-unit-range.csv'
FROM range_mapping_load
GROUP BY LOWER(BTRIM(organizational_unit))
ON CONFLICT (LOWER(BTRIM(organizational_unit))) DO UPDATE
SET range_value = EXCLUDED.range_value,
  source_file_name = EXCLUDED.source_file_name,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
```

Function mapping:

```sql
BEGIN;

CREATE TEMP TABLE function_mapping_load (
  organizational_unit TEXT,
  function_value TEXT
) ON COMMIT DROP;

\copy function_mapping_load (organizational_unit, function_value) FROM 'C:/approved/org-unit-function.csv' WITH (FORMAT csv, HEADER true)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM function_mapping_load
    WHERE NULLIF(BTRIM(organizational_unit), '') IS NULL
       OR NULLIF(BTRIM(function_value), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Function mapping contains a blank Organizational Unit or Function.';
  END IF;

  IF EXISTS (
    SELECT LOWER(BTRIM(organizational_unit))
    FROM function_mapping_load
    GROUP BY LOWER(BTRIM(organizational_unit))
    HAVING COUNT(DISTINCT BTRIM(function_value)) > 1
  ) THEN
    RAISE EXCEPTION 'Function mapping contains conflicting values for an Organizational Unit.';
  END IF;
END;
$$;

INSERT INTO public.org_unit_function_mappings (
  organizational_unit,
  function_value,
  source_file_name
)
SELECT MIN(BTRIM(organizational_unit)), MIN(BTRIM(function_value)), 'org-unit-function.csv'
FROM function_mapping_load
GROUP BY LOWER(BTRIM(organizational_unit))
ON CONFLICT (LOWER(BTRIM(organizational_unit))) DO UPDATE
SET function_value = EXCLUDED.function_value,
  source_file_name = EXCLUDED.source_file_name,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
```

Verify the loaded mappings and identify Organizational Units missing either
lookup before enabling upload logic:

```sql
SELECT COUNT(*) AS range_mapping_count
FROM public.org_unit_range_mappings;

SELECT COUNT(*) AS function_mapping_count
FROM public.org_unit_function_mappings;

SELECT DISTINCT BTRIM(raw.organizational_unit) AS organizational_unit
FROM public.rbin_namelist raw
LEFT JOIN public.org_unit_range_mappings range_map
  ON LOWER(BTRIM(range_map.organizational_unit)) = LOWER(BTRIM(raw.organizational_unit))
LEFT JOIN public.org_unit_function_mappings function_map
  ON LOWER(BTRIM(function_map.organizational_unit)) = LOWER(BTRIM(raw.organizational_unit))
WHERE LOWER(BTRIM(raw.organisational_area_pa)) = 'ps'
  AND (range_map.mapping_id IS NULL OR function_map.mapping_id IS NULL)
ORDER BY organizational_unit;
```

### Initial account bootstrap

Install the API-owned Argon2 dependency from the repository root:

```powershell
npm install --prefix apps/api argon2
```

For a database that already has the original authentication tables, apply the
UUID migration once:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/auth_account_uuid_migration.sql"
```

Create the external HRBP account without a personnel number:

```powershell
Set-Location apps/api
npm run seed:access -- --role hrbp --email hrbp@example.com --name "HRBP Name"
```

Create an Admin account linked to the employee namelist:

```powershell
npm run seed:access -- --role admin --email admin@example.com --name "Admin Name" --pers-no 12345678
```

The command prompts for the temporary password twice with masked input. Run it
only from an interactive terminal. Replace all example values with approved
account details. Do not place the temporary password in command arguments,
environment files, SQL files or shell history.
