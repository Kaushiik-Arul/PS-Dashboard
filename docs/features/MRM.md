# Management Review Meeting (MRM)

MRM reports are shared PostgreSQL documents. Browser `localStorage` is not a data source and the retired `ps-dashboard:mrm-prototype:v1` key is deleted by the client.

## Access and lifecycle

All authenticated HRBP, Admin, Range Head, Department Head, and Sub-department Head roles can view MRM. Only HRBP can save drafts, upload or delete attachments, and finalize reports. Draft saves use an expected revision; a stale revision returns HTTP 409 and must not overwrite local edits.

The reporting month is the first day of a calendar month. Its automated data month is the previous month. The reporting month dropdown displays all available months—both saved reports and months with available Namelist or MRM data sources—allowing you to file reports for any month that has underlying data. A report remains editable while it is a draft. Finalization stores the resolved document, metric buckets, checksum, actor, and timestamp before changing the report status. PostgreSQL triggers reject later changes or deletion under a finalized report.

Managed definitions use stable keys and activation months. Active additions appear in drafts; finalized snapshots retain their original definitions. Custom columns and manual values are shared organization-wide. `Actual 2025` remains manual. Draft-managing HRBPs may override any calculated value cell; untouched cells continue to refresh from Namelist, and saved overrides take precedence until cleared or the report is finalized.

The month selector is labeled by data month, the month the report covers. Selecting 2026-08 opens the stored report whose reporting month is 2026-09, and its rolling columns show Jul'26 and Aug'26 (stored offsets -2 and -1 from the reporting month). Stored reporting months, finalized reports, and URLs (`/mrm?month=YYYY-MM`) continue to use the reporting month.

## Reporting month discovery

The month dropdown is automatically populated by querying all available data sources:

- **Live imports:** The latest confirmed live Namelist import with `import_mode = 'live'`
- **Historical months:** Distinct months in `employee_namelist_monthly` from previous imports
- **MRM snapshots:** Archived monthly metric calculations from finalized reports

For each available data month, a corresponding reporting month (+1) is generated and displayed. Months with existing saved reports show their actual status (draft or finalized); months discovered only from data sources appear as unsaved drafts. This allows MRM reports to be filed for any month with available Namelist or snapshot data, even before creating an explicit report record.

If a month has no saved report and no available data source, it will not appear in the dropdown.

## Sources and calculations

The in-app **Operations guide** (`/mrm/operations-guide`, linked from the MRM header) lists which KPI uses which data and how; keep it in sync with the rules below.

For a data month, MRM uses `employee_namelist` only when the latest confirmed live Namelist import is for that exact month. Otherwise it uses the exact `employee_namelist_monthly.reporting_month`. A missing month is unavailable, not zero. Attrition, Job Rotation and Transfer come from attrition tracking events rather than Namelist rows.

Finalization stores atomic normalized Range and Org Unit buckets. Reads apply the viewer's current `master_access` assignments, so finalized reports continue to honor current scope without duplicate counting. The report renders separate PS Corp and PS-IN tables. PS Corp calculated KPIs exclude the plant ranges NaP, GanP, JaP, and BidP; PS-IN calculations use the full scoped population.

Calculated rows are:

- Direct M&SS and Total M&SS across PS-IN; Indirect M&SS includes indirect employees in BidP, NaP, JaP, and GanP.
- Expat (`employee_group = INBOUND`).
- SUL and Women in SLx for GROUP1/GROUP2/SL2/SL3/SL4.
- Women in overall M&SS, including denominator.
- Gender diversity hiring from Namelist `joining_date`, displayed as separate Female and Male counts and percentages; unrecognized/missing gender is tracked as a quality count.
- Attrition, Job Rotation and Transfer from `employee_attrition_events` (attrition tracking), bucketed by event month and Range/Org Unit: Attrition = resignation and retirement only and Job Rotation = `out_of_ps_out_of_rbin` plus `out_of_ps_within_rbin`, and Transfer = `within_ps`, all counted year to date (1 Jan to the end of the data month). A month with no events shows `0`.
- Expat, Attrition and Job Rotation show `count (x.x%)`, where the percentage is the count divided by the Namelist headcount of the same data month (PS Corp excludes BidP, NaP, JaP and GanP). Zero counts or months without headcount show the plain number. The Transfer cell shows only the year-to-date `Plant → Corp` and `Corp → Plant` counts from `within_ps_type`, with no total or percentage. In the PS Corp table the Transfer row shows only the year-to-date `Corp → Corp` count.
- Internal transfer for exact `INTERNAL`.

## Excel uploads (no storage, no audit)

These uploads only fill report cells in the browser. Nothing is stored; the values persist only when the HRBP saves the draft. They require `mrm:manage`, and the browser reaches the API through Next routes under `apps/web/app/api/mrm/`. The API runs without watch mode, so restart it after code changes.

- **PUL** (`POST /mrm/pul-value`): reads the PS Corp Performance Dashboard PUL KPI summary and consolidation sheets and fills `corp-pul`, `pul`, `indirect-mss`, `direct-mss`, `total-mss`, and from the Consolidation "INPS Personnel Capacity (state)" block the PS-IN rows `pcd-direct-hc` (row `Direct`), `permanent` and `temporary`, all from the `YTD MM.YY` column of the data month. The previous column is filled only when empty.
- **Gender Hiring** (`POST /mrm/gender-hiring-value`, `mrm-gender-hiring.parser.ts`): reads the sheet with the headers `Actual Date of Joining`, `Gender`, `Specific Org unit` (and optionally `Name of Select`, `Lead Time to Offer`). When several sheets have these headers, the one with the most women is used. The two report columns map to the data month (`rolling-latest`) and the month before it (`rolling-previous`). The response feeds a preview dialog with two tabs:
  - **Gender Diversity Hiring**: joiners whose Actual Date of Joining is from 1 Jan to the column month (the Oct column covers Jan to Oct). The cell shows `F: <female> (<x.x>%)`, where the percentage is female ÷ (female + male) of the same period. PS-IN uses all joiners; PS Corp counts only rows whose Specific Org unit maps (via `org_unit_range_mappings`) to a range other than BidP, NaP, JaP and GanP, and its percentage uses only those rows. The "Counted in" dropdown overrides the PS Corp rule per row. Rows with another gender or an unreadable date are not counted.
  - **Hiring performance (Lead Time)**: all genders joined from 1 January up to the column month; the cell is the whole-day average of `Lead Time to Offer` (empty counts as 0), PS-IN over all rows and PS Corp over the Corp-eligible rows.
  - In the preview, each row has a **Counted in** dropdown (PS-IN + PS Corp, or PS-IN only) to override unmapped org units. The table lists only joiners with no range mapping (no warning banner); totals update live and the overrides apply to both tabs. Apply writes the values for both tables and both columns.

## Status dots and export

The status column (green, amber, red) can be set on every row, including calculated rows, while the report is an editable draft. On calculated rows the dot is stored as an override. Export Excel and Copy table write a coloured `●` so the colour is kept.

## Attachments

Attachments are stored in PostgreSQL `BYTEA`. The maximum file size is 10 MB. Allowed types are PDF, XLSX, DOCX, PNG, and JPEG. Downloads require an authenticated scoped viewer. Upload and draft deletion require HRBP. Finalized files are immutable.

## Deployment

Back up PostgreSQL first. Apply `apps/sql/mrm_creation_migration.sql` after authentication, Namelist, Namelist monthly history, and Attrition schemas. The migration is additive, transactional, and idempotent for initial creation and catalog seeding.

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
