# Namelist Updation

## Purpose

Namelist Updation lets an HRBP upload the monthly employee namelist, review and
correct validation errors, and replace `public.employee_namelist` only after an
explicit confirmation.

The feature is available from HRBP Point. It accepts CSV and XLSX files, stages
preview data in PostgreSQL, and keeps the live namelist unchanged until the user
selects **Push namelist**.

The adjacent **RBIN Namelist to PS Namelist** workflow accepts a mixed Active,
Inbound, and Outbound source file, retains the raw upload, stages only PS rows,
and exports a cleaned 29-column workbook without writing to
`public.employee_namelist`.

Full RBIN engineering and operations documentation is available in
[RBIN Namelist to PS Namelist](RBIN_NAMELIST_CLEANING.md).

## Completed capability

- Supports CSV and modern XLSX files.
- Limits uploads to 50 MB and 25,000 employee rows.
- Requires all 29 `employee_namelist` columns but allows columns in any order.
- Normalizes header case and punctuation and supports approved business aliases.
- Validates every row before the live table can be replaced.
- Allows any staged row to be edited and revalidated.
- Provides All, Valid, and Invalid filters with server-side pagination.
- Restricts the workflow to authenticated HRBP users.
- Associates every preview with the HRBP account that uploaded it.
- Expires uncommitted previews after 24 hours.
- Requires explicit confirmation when replacing an import for the same month.
- Replaces the live namelist atomically rather than appending rows.
- Leaves `auth_accounts`, `master_access`, and `employee_status` records untouched.

## Dependencies

The API owns the file-parsing dependencies:

| Package | Purpose |
| --- | --- |
| `csv-parse` | Parses CSV files, including quoted fields and UTF-8 BOM input. |
| `exceljs` | Reads modern `.xlsx` workbooks and converts worksheet cells into import values. |
| `@types/multer` | Supplies development typings for multipart upload infrastructure. The feature uses a small local file contract because of Node 24 and Express namespace compatibility. |

Install declared API dependencies from the repository root:

```powershell
npm install --prefix apps/api
```

Do not use `npm audit fix --force` without reviewing its breaking dependency
changes.

## Database design

### Existing live and audit tables

| Table | Purpose |
| --- | --- |
| `public.employee_namelist` | Current live employee dataset consumed by dashboards and access workflows. |
| `public.namelist_imports` | Audit record for import month, uploader, file, row count, timestamp, and outcome. |

### Staging tables

| Table | Purpose |
| --- | --- |
| `public.namelist_import_previews` | Stores preview ownership, file metadata, reporting month, validation counts, state, and expiry. |
| `public.namelist_import_preview_rows` | Stores each normalized row as JSONB with validation issues and validity state. |

The migration is `apps/sql/namelist_import_staging_migration.sql`. Apply it once
after `auth_creation.sql` and `namelist_creation.sql`:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/namelist_import_staging_migration.sql"
```

Expired previews can be removed by a scheduled job:

```sql
DELETE FROM public.namelist_import_previews
WHERE status = 'ready'
  AND expires_at <= CURRENT_TIMESTAMP;
```

## Upload and validation workflow

1. The HRBP selects a CSV or XLSX file in HRBP Point.
2. The browser sends multipart form data to the Next.js Route Handler.
3. The Route Handler forwards the file, authenticated session cookie, and CSRF header to NestJS.
4. NestJS verifies authentication and the `namelist:import` permission.
5. The parser validates the file format, worksheet count, headers, row count, and values.
6. Parsed rows and validation issues are saved in account-owned staging tables.
7. The browser requests paginated staged rows for review.
8. Row edits are sent to NestJS and the complete staged set is revalidated so duplicate employee numbers remain accurate.
9. Push is enabled only when `invalidRows` is zero and any required same-month confirmation is selected.
10. Commit acquires a PostgreSQL advisory transaction lock, rechecks the preview, deletes the live rows, inserts every staged row, records the completed import, and commits atomically.
11. Any transaction failure rolls back the deletion and insertion, preserving the previous live namelist.

## File rules

### Supported formats

- `.csv`
- `.xlsx`

Legacy `.xls`, empty files, encrypted or unreadable workbooks, and workbooks with
more than one non-empty worksheet are rejected.

### Header rules

Every expected column must appear exactly once. Unknown, missing, and duplicate
headers are rejected with their names included in the response. Header matching
is case-insensitive and converts punctuation, spaces, and hyphens to underscores.

Approved aliases include:

| Uploaded header | Database column |
| --- | --- |
| `Pers.No.` | `pers_no` |
| `Personnel No` | `personnel_number` |
| `Cost Ctr` | `cost_center` |
| `Date of Birth` | `birth_date` |
| `Date of Joining` or `Date of Joinin` | `joining_date` |
| `Global-Id of HRBP` | `hrbp_global_id` |
| `Global-Id of HRBP2` | `hrbp2_global_id` |
| `Email Official` | `official_email` |

### Row rules

- All 29 columns must be present.
- Every value must be non-empty except the conditional `function` exception.
- `function` may be empty only when trimmed `employee_group` equals `outbound`, case-insensitively.
- `pers_no`, `global_id`, and `hrbp_global_id` must be positive whole numbers compatible with PostgreSQL `BIGINT`.
- `birth_date`, `joining_date`, `entry_for_retirement`, and `technical_entry_date` must be valid `YYYY-MM-DD` dates.
- `official_email` must have a valid email shape.
- Every occurrence of a duplicated `pers_no` is invalid.
- XLSX identifiers larger than JavaScript's safe integer range must be formatted as text in Excel to prevent precision loss.

## API contract

All endpoints use the `/api/v1/hrbp-point/namelist-imports` prefix and require
the `namelist:import` permission.

| Method and path | Purpose |
| --- | --- |
| `POST /previews` | Accept multipart field `file`, parse it, validate rows, and create an owned preview. |
| `GET /previews/:previewId/rows` | Return filtered, paginated preview rows and current summary counts. |
| `PATCH /previews/:previewId/rows/:rowNumber` | Replace one staged row, then revalidate the staged dataset. |
| `DELETE /previews/:previewId` | Cancel and delete an uncommitted preview. |
| `POST /previews/:previewId/commit` | Atomically replace the live namelist after validation and confirmation. |

Supported row query parameters are `filter=all|valid|invalid`, `page`, and
`pageSize`. The maximum page size is 100.

## Security and data integrity

- Frontend visibility is limited by `manageNamelist`.
- Backend authorization is authoritative and requires `namelist:import`.
- The HRBP role receives the import permission; other roles do not.
- Mutating requests require the existing session-bound CSRF token.
- Preview queries include both `preview_id` and `uploaded_by`, preventing one HRBP from accessing another HRBP's staging data.
- Preview expiry is enforced when loading and committing.
- Commit uses `PG_ADVISORY_XACT_LOCK` to serialize namelist replacements.
- The final `DELETE` and `INSERT ... SELECT` occur in one database transaction.
- SQL inserts list every destination column explicitly and cast staged values to their database types.
- Related account, access, and leave-status tables are neither modified nor used to block replacement.

## User interface

HRBP Point contains three coordinated sections:

- **Employee leave status** provides the existing status CRUD workflow.
- **Namelist updation** provides the active monthly import workflow.
- **RBIN Namelist to PS Namelist** provides the active cleaning, comparison, editing, finalization, and XLSX export workflow.

Namelist Updation shows the reporting month, file constraints, selected file,
validation counts, filtered rows, pagination, and confirmation state. The
preview defaults to eight key columns for readability and offers an **All 29
fields** view. Editing a row opens an in-dialog side panel containing all fields.

## RBIN cleaning workflow

See [RBIN Namelist to PS Namelist](RBIN_NAMELIST_CLEANING.md) for the complete
process, dependencies, database contract, mapping loader, API/UI behavior,
security model, verification steps, and troubleshooting guide.

RBIN cleaning requires the 28 source fields exactly once but accepts them in
any order. The standard RBIN export labels both final HRBP columns
`Global-Id of HRBP`; when no explicit HRBP2 header exists, the second occurrence
is treated as `hrbp2_global_id`. Every uploaded source row is retained in
`public.rbin_namelist`; only
rows whose trimmed, case-insensitive `Organisational Area(PA)` value is `PS` are
copied to permanent staging. `Other Designation` is not included in the cleaned
output.

Range and Function are derived independently from their Organizational Unit
mapping tables. Both values are required for every staged employee, including
Outbound employees. Missing mappings remain editable, appear in the preview
alert, and prevent finalization until resolved. Staged rows are compared by
`pers_no` with the frozen `employee_namelist` baseline and classified as New,
Changed, or Unchanged.

The account-owned backend endpoints are rooted at
`/api/v1/hrbp-point/rbin-cleaning`:

| Method and path | Behavior |
| --- | --- |
| `POST /batches` | Retain the raw upload and create permanent transformed staging. |
| `GET /batches` | List the authenticated HRBP's retained batches. |
| `GET /batches/:batchId/rows` | Return searched, filtered, paginated staged rows and summary counts. |
| `PATCH /batches/:batchId/rows/:rowNumber` | Save a complete edited row and revalidate the batch. |
| `POST /batches/:batchId/finalize` | Lock a valid draft for export. |
| `POST /batches/:batchId/export` | Generate, audit, and download the 29-column XLSX file. |

RBIN mutations require the session-bound CSRF token. Transformation requires
`namelist:transform`; export additionally requires `namelist:export`. Export
records and staging batches are retained permanently, and the workflow never
updates `public.employee_namelist`. Preview pagination supports 25, 50, or 100
rows per page and defaults to 50. The optional `search` query parameter performs
a case-insensitive substring search across `pers_no` and `personnel_number`
before pagination.

## File responsibilities

### Database

| File | Responsibility |
| --- | --- |
| `apps/sql/namelist_creation.sql` | Defines the live employee namelist and import audit tables. |
| `apps/sql/namelist_import_staging_migration.sql` | Creates account-owned preview sessions, staged rows, indexes, expiry metadata, and cleanup guidance. |
| `apps/sql/README.md` | Documents migration order, setup commands, and the database contract. |

### API

| File | Responsibility |
| --- | --- |
| `apps/api/package.json` | Declares CSV, XLSX, and multipart typing dependencies. |
| `apps/api/package-lock.json` | Locks the installed dependency graph for reproducible API installs. |
| `apps/api/src/common/authorization/permissions.ts` | Defines `namelist:import` and grants it to HRBP users. |
| `apps/api/src/modules/hrbp-point/hrbp-point.module.ts` | Registers the import controller, service, and repository in HRBP Point. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.types.ts` | Defines the 29-column schema and backend preview, row, issue, and pagination types. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.parser.ts` | Parses CSV/XLSX files, maps headers, normalizes values, and validates rows. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.repository.ts` | Persists previews, retrieves pages, saves edits, and performs the atomic live-table replacement. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.service.ts` | Orchestrates parsing, validation, ownership checks, pagination input, edits, cancellation, and commit errors. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.controller.ts` | Exposes the HRBP-only multipart and JSON endpoints. |
| `apps/api/src/modules/hrbp-point/namelist-import/namelist-import.parser.spec.ts` | Tests reordered headers, business aliases, required columns, and the outbound `function` exception. |

### Web

| File | Responsibility |
| --- | --- |
| `apps/web/src/auth/permissions.ts` | Defines the HRBP-only `manageNamelist` presentation permission. |
| `apps/web/src/features/hrbp-point/HrbpPointDashboard.tsx` | Places Namelist operations below Employee Leave Status and renders both only within HRBP Point. |
| `apps/web/src/features/hrbp-point/NamelistImportPanel.tsx` | Implements file selection, preview dialog, filtering, pagination, row editing, confirmation, and import feedback. |
| `apps/web/src/features/hrbp-point/namelist-import.types.ts` | Defines the browser-side import contract shared by UI adapters. |
| `apps/web/src/features/hrbp-point/namelist-import.http.ts` | Implements the browser client for upload, preview pages, edits, cancellation, and commit. |
| `apps/web/src/features/hrbp-point/namelist-import.api.ts` | Implements authenticated server-to-Nest request forwarding and upstream error handling. |
| `apps/web/src/features/hrbp-point/namelist-import.mock.ts` | Retains a local deterministic adapter for isolated UI fixtures; it is not used by the live panel. |
| `apps/web/src/features/hrbp-point/hrbp-point.css` | Styles Employee Leave Status, Namelist sections, preview workspace, data grid, and row editor responsively. |
| `apps/web/app/api/hrbp-point/namelist-imports/previews/route.ts` | Proxies multipart preview creation to NestJS. |
| `apps/web/app/api/hrbp-point/namelist-imports/previews/[previewId]/rows/route.ts` | Proxies paginated preview-row reads to NestJS. |
| `apps/web/app/api/hrbp-point/namelist-imports/previews/[previewId]/rows/[rowNumber]/route.ts` | Proxies staged-row edits to NestJS. |
| `apps/web/app/api/hrbp-point/namelist-imports/previews/[previewId]/route.ts` | Proxies preview cancellation to NestJS. |
| `apps/web/app/api/hrbp-point/namelist-imports/previews/[previewId]/commit/route.ts` | Proxies final import confirmation to NestJS. |

## Verification

Run from the repository root:

```powershell
npm test --prefix apps/api -- namelist-import.parser.spec.ts
npm run build --prefix apps/api
npm run build --prefix apps/web
```

For an end-to-end check, upload a valid file from HRBP Point, review the staged
rows, select the same-month confirmation when shown, and push the import. Then
verify:

```sql
SELECT COUNT(*) FROM public.employee_namelist;

SELECT id, reporting_month, imported_at, imported_by, file_name, total_rows, status
FROM public.namelist_imports
ORDER BY imported_at DESC
LIMIT 5;
```

The live row count must equal the uploaded valid dataset, and the latest audit
record must have `status = 'completed'`.
