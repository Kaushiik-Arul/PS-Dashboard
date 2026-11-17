# Cleanup Test Gate

Run the smoke suite before cleanup starts and after every cleanup phase. It verifies the running Next.js application, the direct NestJS API, the Next-to-Nest API proxy, authentication boundaries, and cross-site mutation protection.

## Prerequisites

- PostgreSQL and the NestJS API are running.
- The API is available at `http://127.0.0.1:3001/api/v1`.
- The Next.js application is running at `http://127.0.0.1:3000`.
- No authenticated browser session or test account is required.

## Run the suite

From the repository root:

```powershell
& .\infra\scripts\test-smoke.ps1
```

Override either URL when testing another environment:

```powershell
& .\infra\scripts\test-smoke.ps1 `
  -WebBaseUrl "http://127.0.0.1:3100" `
  -ApiBaseUrl "http://127.0.0.1:3101/api/v1"
```

The command exits with code `0` only when every check passes. A cleanup phase is complete only when this suite passes and that phase's focused checks pass.

## Cleanup workflow

1. Run the smoke suite and record a passing baseline.
2. Make one cleanup phase's changes.
3. Run the focused checks for the changed API or web code.
4. Run the smoke suite again.
5. Commit the phase only after all checks pass.

The suite intentionally uses anonymous, read-only requests except for a mutation that Next.js rejects before it reaches the API. It does not create, update, or delete application data.
