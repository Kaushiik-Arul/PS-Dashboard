# Overview database contract

API endpoint: GET /api/v1/overview

Source tables: public.employee_namelist, public.employee_status

| Function | Arguments | Return type | Purpose |
| --- | --- | --- | --- |
| public.get_workforce_kpis() | Optional DATE | JSONB | Overview KPI values |
| public.get_workforce_charts() | Optional DATE | JSONB | Overview chart data |

## Rules

- Both functions are read-only. Workforce KPIs and charts use employee_namelist;
  maternity, sabbatical, and CRL KPIs use active employee_status records.
- Date-based calculations use CURRENT_DATE.
- An employee_status record is active when start_date is null or on/before the
  calculation date and end_date is null or on/after the calculation date.
- Missing source data produces null/unavailable results, not invented values.
- The API returns an object containing kpis and charts.
- The functions return JSON objects, not formatted JSON text.
- These functions accept an optional calculation date and no dashboard filters.
- Update this contract and the response DTOs when output fields change.
- Store function definitions in apps/sql/functions.
- Apply database changes through versioned migrations.
