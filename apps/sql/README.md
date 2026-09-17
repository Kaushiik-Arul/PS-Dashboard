## Overview database contract

API endpoint: GET /api/v1/overview

Source table: public.employee_namelist

| Function | Arguments | Return type | Purpose |
|---|---|---|---|
| public.get_workforce_kpis() | None | JSONB | Overview KPI values |
| public.get_workforce_charts() | None | JSONB | Overview chart data |

### Rules

- Both functions are read-only and use employee_namelist as their data source.
- Date-based calculations use CURRENT_DATE.
- Missing source data produces null/unavailable results, not invented values.
- The API returns an object containing kpis and charts.
- The functions return JSON objects, not formatted JSON text.
- These functions currently accept no filter arguments.
- Update this contract and the response DTOs when output fields change.
- Store function definitions in apps/sql/functions.
- Apply database changes through versioned migrations.