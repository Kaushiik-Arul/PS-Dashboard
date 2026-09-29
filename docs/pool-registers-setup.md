# Development and Talent Pool registers

Built against master cc409e2. Reuses the Active STEP preview/editor layout and shared DataTable filters/pagination.

## Apply (PowerShell, repository root)

```powershell
cd C:\Projects\PS-Dashboard
git apply --check .\pool-registers.patch
git apply .\pool-registers.patch
```

## Database migration (once)

SQL: `apps/sql/pool_registers_migration.sql`.
The runner uses the existing DATABASE_URL from apps/api/.env and the installed pg dependency.
It skips the migration if the pool-register schema is already present.

```powershell
cd C:\Projects\PS-Dashboard\apps\api
node --env-file=.env scripts/migrate-pool-registers.cjs
```

Alternative, if psql is installed and DATABASE_URL is already set in PowerShell:

```powershell
cd C:\Projects\PS-Dashboard
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\apps\sql\pool_registers_migration.sql
```

Run only one of the two migration methods. The SQL creates new tables and does not modify the namelist or Active STEP data.

Restart the API and web processes after applying the patch and migration:

```powershell
# Terminal 1
cd C:\Projects\PS-Dashboard\apps\api
npm run start:dev
```

```powershell
# Terminal 2
cd C:\Projects\PS-Dashboard\apps\web
npm run dev
```

## Behavior

- Remove People to STEP Position Matching and replace the old dummy combined register with Development Pool Register and Talent Pool Register.
- HRBP Point: XLSX upload and preview for each register.
- Talent Pipeline: HRBP-only Add employee button and edit/delete controls in each register. Other roles retain their scoped read-only view.
- Manual entry fetches employee name, PS Group, Org Unit, Range and (for Talent) Gender from the current namelist after leaving Pers.No. Missing employees can be entered manually.
- Excel uploads retain supplied values. Missing namelist employees and differences are nonblocking warnings under their cells.
- Repeated personnel numbers are invalid within a register; the same employee can belong to both registers.
- Editing/deleting preview rows revalidates duplicates. Each invalid cell explains its error.
- A checked confirmation replaces all rows only in the chosen register, including manually added rows. Writes are transactional. If the register changes after preview, a fresh upload is required.
- Required values: personnel number, employee name, pool, start date and end date. Talent also requires Active or Passive. Other fields can be blank; namelist mismatches remain warnings.
- First worksheet, headers on row 1, up to 25,000 data rows, XLSX up to 50 MB.
- Development headers: E. No., Employee Name, Current Grp, Department, Department Feb, Range, Development Pool, Pool Start Date (dd/mm/yyyy), Pool End date (dd/mm/yyyy).
- Talent headers: Pers.No., E name, PS group, Organizational Unit, Range, Talent Pool, Gender, From, To, Active/Passive.
- Development start and Talent From/To: DD.MM.YYYY. Development end: MM/DD/YYYY despite its header. ISO YYYY-MM-DD and real Excel date cells also work. All stored/displayed dates use YYYY-MM-DD. Impossible dates and reversed periods are invalid.
- Existing role-based access applies. Employees absent from the namelist are visible to HRBP/Admin; narrower roles require a current namelist scope match.

## Undo code changes

Before further edits to the patched files:

```powershell
cd C:\Projects\PS-Dashboard
git apply -R --check .\pool-registers.patch
git apply -R .\pool-registers.patch
```

Reversing the patch does not undo confirmed Excel replacements or restore deleted records. New database tables can remain in place, retaining their data, while the feature is removed. No database deletion is required to undo the code.

## Verification performed

- API and web TypeScript checks.
- Lint checks for changed feature files.
- Eight parser/validation tests covering both templates, exact date formats, real Excel dates, impossible dates, duplicate correction and namelist warnings.
- Isolated PostgreSQL-compatible database checks (PGlite): migration, CRUD/lookup, duplicate uniqueness, preview edits/deletes, revalidation, confirmation, per-register replacement, preview ownership, role scopes, stale previews, cancellation, last-row guard and atomic rollback after an injected failure.
- Next route proxy checks: PATCH/DELETE/commit, CSRF forwarding and 204 responses.
- Full application browser verification was unavailable: the private Bosch UI package is not accessible here and browser installation failed. No claim of full end-to-end browser verification.
