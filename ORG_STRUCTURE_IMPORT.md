# Org Structure Import

## Purpose

HRBP users can upload the role hierarchy from HRBP Point, review every source
row, edit or delete staged rows, and replace the current Org Structure after an
explicit confirmation. The live Org Structure page is also restricted to HRBP
users.

## Workbook format

The first worksheet must use these columns in this order:

| Column | Displayed as |
| --- | --- |
| `Role Title` | The role shown in the hierarchy |
| `Reporting To` | Parent role title |
| `JD ID` | Job-description identifier |
| `Career Level` | Imported career-level text |
| `Layer` | Imported layer text, such as `L1` or `L2` |
| `Order By` | Numeric sibling order |
| `Is Active` | `Yes`, `True`, `1`, or `Y` is stored as active; other values are inactive |
| `Grade` | Optional imported grade text |
| `Function` | Optional imported function text |

The file must be XLSX, no larger than 50 MB, with no more than 25,000 nonempty
data rows. The first seven columns are required in the order above. `Grade` and
`Function` may be appended in either order or omitted. These are processing
safeguards, not business validation.

## Import behavior

- Preview rows are stored for 24 hours and are visible only to the HRBP account
  that uploaded them.
- Every preview value can be edited and every row except the last can be deleted.
- The import does not look up JD IDs, reject duplicate role titles, require a
  matching parent, or assign valid/invalid states.
- Confirmation atomically deletes the current rows and inserts the complete
  preview. It does not append or upsert.
- A preview cannot overwrite a newer import created after that preview began.

## Hierarchy behavior

Rows with a blank `Reporting To` value form the roots of an expandable recursive
hierarchy. Each other row is attached beneath the first imported role whose
normalized `Role Title` matches its `Reporting To` value. Missing parents and
cyclic reporting relationships are preserved in a separate **Unlinked roles**
section rather than being omitted.

Children are sorted by `Order By` ascending and then `Role Title` ascending.
Layer, Grade, and Function are displayed metadata and do not create hierarchy
links. Filters retain ancestor rows as context. The page shows active roles by
default and provides Active, Inactive, and All filters.

## Database setup

Apply the migration after the authentication schema exists:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/org_structure_migration.sql"
```

For an existing Org Structure installation, add the optional metadata columns:

```powershell
$db=((Get-Content apps/api/.env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1) -split '=',2)[1].Trim().Trim('"').Trim("'")
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --dbname="$db" --set ON_ERROR_STOP=1 --file="apps/sql/org_structure_grade_function_migration.sql"
```

Optional expired-preview cleanup:

```sql
DELETE FROM public.org_structure_previews
WHERE status = 'ready'
  AND expires_at <= CURRENT_TIMESTAMP;
```
