# Management Review Meeting (MRM)

MRM reports are shared PostgreSQL documents. Browser `localStorage` is not a data source and the retired `ps-dashboard:mrm-prototype:v1` key is deleted by the client.

## Access and lifecycle

All authenticated HRBP, Admin, Range Head, Department Head, and Sub-department Head roles can view MRM. Only HRBP can save drafts, upload or delete attachments, and finalize reports. Draft saves use an expected revision; a stale revision returns HTTP 409 and must not overwrite local edits.

The reporting month is the first day of a calendar month. Its automated data month is the previous month. A report remains editable while it is a draft. Finalization stores the resolved document, metric buckets, checksum, actor, and timestamp before changing the report status. PostgreSQL triggers reject later changes or deletion under a finalized report.

Managed definitions use stable keys and activation months. Active additions appear in drafts; finalized snapshots retain their original definitions. Custom columns and manual values are shared organization-wide. `Actual 2025` remains manual. Calculated values are written to both rolling month columns.

## Sources and calculations

For a data month, MRM uses `employee_namelist` only when the latest confirmed live Namelist import is for that exact month. Otherwise it uses the exact `employee_namelist_monthly.reporting_month`. A missing month is unavailable, not zero. Attrition rows are bounded by `lwd` within the data month.

Before detailed Namelist retention deletes an older monthly dataset, the import
transaction stores normalized MRM metric buckets for that data month. MRM reads
those scoped monthly snapshots after detailed employee rows expire. For example,
a September report continues to show July and August even after an October
Namelist import retains only August, September, and October employee detail.

Finalization stores atomic normalized Range and Org Unit buckets. Reads aggregate distinct buckets through the viewer's current `master_access` assignments, so finalized reports continue to honor current scope without duplicate counting.

Calculated rows are:

- Direct M&SS, Total M&SS, and indirect blue collar for BIDP/NAP/JAP/GANP.
- Expat (`employee_group = INBOUND`).
- SUL and Women in SLx for GROUP1/GROUP2/SL2/SL3/SL4.
- Women in overall M&SS, including denominator.
- Gender diversity hiring from Namelist `joining_date`, including unrecognized/missing gender quality count.
- Attrition for Resignation, Retirement, or exact `TRANSFER INTRA ENTITY`.
- Job Rotation for exact `TRANSFER INTRA BOSCH`.
- Internal transfer for exact `INTERNAL`.

## Attachments

Attachments are stored in PostgreSQL `BYTEA`. The maximum file size is 10 MB. Allowed types are PDF, XLSX, DOCX, PNG, and JPEG. Downloads require an authenticated scoped viewer. Upload and draft deletion require HRBP. Finalized files are immutable.

## Deployment

Back up PostgreSQL first. Apply `apps/sql/mrm_creation_migration.sql` after authentication, Namelist, Namelist monthly history, and Attrition schemas. Then apply `apps/sql/mrm_monthly_metric_snapshots_migration.sql`. The migrations are additive and transactional.

Deploy in this order:

1. Database backup.
2. MRM migration and seeded catalog.
3. NestJS API.
4. Next.js web application.
5. Read smoke test for every role.
6. HRBP save, conflict, attachment, finalization, history, and scoped-view smoke tests.

Apply to a backup or test database with:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/mrm_creation_migration.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/mrm_monthly_metric_snapshots_migration.sql"
```

If migration application fails, `ON_ERROR_STOP=1` and the transaction roll back the attempt. Correct the reported prerequisite or SQL issue and rerun the whole migration. After deployment, use forward migrations for catalog/schema changes. Do not edit finalized rows or restore selected child tables independently; restore the complete database backup when rollback is required.

## Validation

From `apps/api`, run the focused tests and API checks:

```powershell
npm test -- attrition-classification.spec.ts mrm-calculation.service.spec.ts --runInBand
npm run lint
npm run build
```

From `apps/web`, run:

```powershell
npm run lint
npm run build
```

Then apply the SQL migration to a backup/test database with `ON_ERROR_STOP=1` and perform the role, save, conflict, missing-source, attachment, finalization, immutable-history, and managed-definition activation smoke tests.
