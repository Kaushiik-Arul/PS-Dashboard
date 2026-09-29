# STEP-Available Talent

Apply step-available-talent.patch from the repository root. Based on master 0df4db8.

```powershell
git apply --check .\step-available-talent.patch
git apply .\step-available-talent.patch
cd apps\api
node --env-file=.env scripts/migrate-available-talent.cjs
```

The migration reads DATABASE_URL from apps/api/.env and creates only the five available_talent tables. SQL is in apps/sql/available_talent_migration.sql. Restart API and web after migration. No additional npm dependencies.

Talent Pipeline has an HRBP-only + icon and edit/delete actions. Manual E.No lookup fills name from personnel_number, entity from lp, department from organizational_unit and HRBP name directly from hrbp2_global_id. All fields remain editable. JDID accepts a full ID or a three-digit suffix; multiple matches require selection.

HRBP Point provides XLSX upload. First sheet, headers in row 1: E.No, E. Name, Entity, Dept, HRBP, Preferrences (or Preferences), Current Status, Comments, JDID. Only E.No and E. Name need values. Excel values are preserved. Employees outside the current namelist, differences from namelist and unknown JDIDs are warnings. Duplicate numbers and invalid required values block confirmation. Preview has per-cell reasons, edit/delete, filters and pagination. Warnings are recomputed after every edit. Confirmation atomically replaces only this table. Concurrent manual changes invalidate older previews.

Undo uncommitted patch from the repository root:

```powershell
git apply -R --check .\step-available-talent.patch
git apply -R .\step-available-talent.patch
```

This reverses code only. It does not undo imports or drop database tables. Retaining the new tables is safe when reverting code. Do not use git reset --hard to reverse this patch.

Validation: API/web TypeScript, focused lint, parser regression tests and isolated PGlite service checks (SQL migration, lookup, manual overrides, duplicates, preview edits/deletion, warning retention, replacement transaction rollback and stale previews). Browser appearance and the user's live database were not tested.
