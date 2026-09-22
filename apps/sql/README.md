# Overview database contract

API endpoint: GET /api/v1/overview

Source tables: public.employee_namelist, public.employee_status

| Function | Arguments | Return type | Purpose |
| --- | --- | --- | --- |
| public.get_workforce_kpis() | DATE, six optional TEXT filters, authenticated account UUID | JSONB | Scope-filtered overview KPI values |
| public.get_workforce_charts() | DATE, six optional TEXT filters, authenticated account UUID | JSONB | Scope-filtered overview chart data |

## Rules

- Both functions are read-only. Workforce KPIs and charts use employee_namelist;
  maternity, sabbatical, and CRL KPIs use active employee_status records.
- Date-based calculations use CURRENT_DATE.
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
- Employee-status KPI filters join employee_status to employee_namelist by pers_no.
- Update this contract and the response DTOs when output fields change.
- Store function definitions in apps/sql/functions.
- Apply database changes through versioned migrations.

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

Apply `namelist_import_staging_migration.sql` after `auth_creation.sql` and
`namelist_creation.sql` before enabling Namelist Updation. It creates expiring,
account-owned preview data used between upload and confirmation requests.

The import accepts CSV and XLSX files with all 29 `employee_namelist` columns.
Column order may differ; header matching is case-insensitive and normalizes
spaces and hyphens to underscores. Every value is required except `function`,
which may be blank only when `employee_group` is `outbound`. A successful Push
replaces the complete `employee_namelist` within one transaction.

Install the API parser dependencies after pulling this change:

```powershell
npm install --prefix apps/api
```

Apply the staging migration once:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/namelist_import_staging_migration.sql"
```

Preview sessions expire after 24 hours. A scheduled cleanup may run:

```sql
DELETE FROM public.namelist_import_previews
WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;
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
