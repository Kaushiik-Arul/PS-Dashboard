# Project Handover and Orientation

Read this first. It explains what PS Dashboard is, how the repository is laid out, how to run it, and the rules that are easy to get wrong.

## What the product is

PS Dashboard is an HR analytics and operations tool for the PS organization. HRBPs import monthly source files (namelist, headcount, attrition, RBIN, and others). Managers view demographics, employee profiles, talent and succession views, attrition, org structure, and the monthly Management Review Meeting (MRM) report. Role and scope decide what each person sees. The full module list is in [Project Features](features/PROJECT_FEATURES.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/web` | Next.js front end. Routes in `app/`, feature code in `src/features/<feature>`, shared UI in `src/components`, auth in `src/auth`. |
| `apps/api` | NestJS API. One folder per domain in `src/modules` (auth, hrbp-point, mrm, attrition, overview, employee-360, succession-planning, talent-pipeline, access-point, and others). |
| `apps/sql` | Plain SQL migrations. `bootstrap_fresh_database.sql` builds a new database. |
| `docs` | Documentation (see the index in [README](README.md)). |
| `infra` | Infrastructure files. |

The browser never calls the API directly for protected actions. It goes through Next route handlers under `apps/web/app/api/...`, which forward to the NestJS API with the session and CSRF protection.

## Running locally

1. Copy `.env.example` and set `DATABASE_URL` in `apps/api/.env`. The app database is **PS**. Check which database your SQL client is connected to; PS_DEV is a different database.
2. Apply migrations from `apps/sql` (or `bootstrap_fresh_database.sql` for a new database).
3. API: `cd apps/api; npm run start:dev` (the MRM notes assume the API may run without watch mode, so restart it after code changes).
4. Web: `cd apps/web; npm run dev`.
5. Checks: API `npm test -- src/modules/mrm`, `npm run lint`, `npm run build`. Web `npx tsc --noEmit`, `npm run lint`, `npm run build`.

The web app uses a Next.js version with breaking changes. Read the guide in `node_modules/next/dist/docs/` before writing Next code (see [AGENTS.md](../AGENTS.md)).

## Key data concepts

- **Live namelist:** `employee_namelist`, the current month. **History:** `employee_namelist_monthly`. Audit of imports: `namelist_imports`. Only three months are kept at row level (live plus the two newest monthly months); older months keep checksummed JSON for Overview.
- **Demographics/Overview** reads those namelist tables. A month missing from them is unavailable, not zero.
- **Attrition tracking:** `employee_attrition_events`, fed by the Attrition import and the RBIN/PS Exit movement review. Event types include resignation, retirement, `out_of_ps_out_of_rbin`, `out_of_ps_within_rbin` and `within_ps` (with `within_ps_type` Plant/Corp).
- **Range mapping:** `org_unit_range_mappings` maps a Specific Org unit to a Range. PS Corp figures exclude the BidP, NaP, JaP and GanP ranges.
- **Reporting month vs data month:** a report for reporting month M uses data month M-1. Its columns show M-2 and M-1.

## MRM, the most recently changed area

Everything is in [MRM.md](features/MRM.md); the in-app summary is at `/mrm/operations-guide`. In short:

- Namelist KPIs are calculated automatically. Attrition, Job Rotation and Transfer are year to date from attrition events, with percentages over the same month's headcount.
- PUL and Gender Hiring are Excel uploads that only fill cells in the browser (no storage, no audit). Save the draft to keep them.
- HRBP can override any calculated cell, including the status dot, while the report is a draft. Finalized reports are immutable (database triggers).
- Excel export writes coloured `●` for status dots.
- Code: `apps/api/src/modules/mrm` (calculation repository and service, `mrm.service.ts`, the two parsers) and `apps/web/src/features/mrm` (`MrmReport.tsx`, `MrmOperationsGuide.tsx`, `mrm.css`).

If you change a KPI rule, update `mrm.service.spec.ts`, [MRM.md](features/MRM.md), the Operations guide component, and [Project Features](features/PROJECT_FEATURES.md) together.

## Roles and access

Roles include HRBP, Admin, Range Head, Department Head and Sub-department Head. Permissions are checked in `apps/web/src/auth/permissions.ts` and enforced again in the API. Only HRBP can edit and finalize MRM or run imports. Data scope comes from `master_access`.

## Known issues and gotchas

- Two `rbin-mappings` API tests fail already; they are unrelated to MRM.
- `edit` tooling on CRLF files can fail on whitespace; check line endings if a replace does not match.
- An unmapped org unit has a blank range. It counts in PS-IN only in the Gender Hiring parser, and in both tables in the metric calculation.
- The Gender Hiring workbook may contain women with a blank joining date; they cannot be counted.
- Status dots are stored as overrides on calculated rows, so they survive recalculation.

## Where to go next

- Imports: [Namelist](imports/NAMELIST_IMPORT.md), [Monthly Headcount](imports/MONTHLY_HEADCOUNT_IMPORT.md), [Org Structure](imports/ORG_STRUCTURE_IMPORT.md), [RBIN cleaning](imports/RBIN_NAMELIST_CLEANING.md).
- Architecture: [Security](architecture/SECURITY_ARCHITECTURE.md), [Engineering and deployment](architecture/SYSTEM_ENGINEERING_AND_DEPLOYMENT_GUIDELINES.md).
- Coding standards: `apps/web/NEXTJS_ENGINEERING_GUIDELINES.md`, `apps/api/NESTJS_ENGINEERING_GUIDELINES.md`.
