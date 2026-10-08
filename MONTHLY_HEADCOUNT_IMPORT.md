# Monthly Headcount Import

The temporary HRBP Point importer calculates permanent monthly headcount
aggregates from multi-sheet PS Namelist workbooks. It does not import or retain
employee-level rows.

## Database setup

Apply the migration once before using the importer:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/employee_headcount_import_migration.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/employee_headcount_org_unit_migration.sql"
```

The migration creates:

| Table | Retention | Purpose |
| --- | --- | --- |
| `employee_headcount_imports` | Permanent | Import audit and source workbook metadata |
| `employee_headcount_months` | Permanent | One overall headcount per reporting month |
| `employee_headcount_by_range` | Permanent | One headcount per reporting month and normalized Range |
| `employee_headcount_by_org_unit` | Permanent | One headcount per reporting month and normalized Org Unit |
| `employee_headcount_by_range_org_unit` | Permanent | One headcount per reporting month and exact Range/Org Unit tuple |
| `employee_headcount_import_previews` | Temporary | Account-owned, 24-hour calculated previews |

## Workbook rules

- Upload one `.xlsx` workbook at a time, with a maximum size of 50 MB.
- Only worksheets named as a full or abbreviated English month and two- or
  four-digit year are imported. The space is optional. Examples: `January
  2023`, `Jan 23`, `July23`, and `Aug 2026`.
- Other worksheets are listed as ignored in the preview.
- The importer scans the first 20 rows for exactly one `Pers.No`, one `Range`,
  and one Org Unit column. Accepted Org Unit headers are `Org Unit`,
  `Organizational Unit`, and `Organisational Unit`.
- `Pers.No` values must be positive whole numbers and unique within a monthly
  worksheet.
- Employees with a blank Range count in the overall monthly headcount but not
  in a Range subtotal.
- Employees with a blank Org Unit count in the overall and applicable Range
  totals, but not in Org Unit or Range/Org Unit subtotals.
- Range matching is case-insensitive and ignores surrounding or repeated
  whitespace.
- Org Unit matching uses the same normalization.
- Existing months are replaced only after explicit confirmation.
- A workbook is committed atomically; validation or database failures leave all
  permanent months unchanged.
- Worksheets and rows are processed sequentially with styles and hyperlinks
  ignored, preventing multi-year workbooks from expanding into Node's heap.

## Verification queries

```sql
SELECT reporting_month, total_headcount, source_import_id
FROM public.employee_headcount_months
ORDER BY reporting_month;

SELECT reporting_month, range_name, headcount
FROM public.employee_headcount_by_range
ORDER BY reporting_month, range_name;

SELECT reporting_month, org_unit_name, headcount
FROM public.employee_headcount_by_org_unit
ORDER BY reporting_month, org_unit_name;

SELECT reporting_month, range_name, org_unit_name, headcount
FROM public.employee_headcount_by_range_org_unit
ORDER BY reporting_month, range_name, org_unit_name;
```

For each month, the sum of Range subtotals may be lower than the overall total
when the source sheet contains employees with a blank Range. It must never be
higher.

After applying the Org Unit migration, reimport every historical workbook so
all existing months receive Org Unit and Range/Org Unit aggregates. Historical
Org Unit totals cannot be reconstructed from the earlier overall/Range-only
aggregates.

## Removing the temporary tool

After historical workbooks are imported and verified, remove the temporary
panel, HTTP client, Next.js proxy, NestJS controller/service/repository/parser,
module registrations, and `headcount:import` permission. Keep the permanent
aggregate tables and their audit data. The preview table can then be dropped in
a separate migration.
