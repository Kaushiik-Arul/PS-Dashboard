# Infrastructure

This directory currently contains operational helper scripts. Production container, reverse-proxy, deployment, and backup automation have not yet been implemented in this repository.

Empty Compose, nginx, deployment, and backup placeholders were removed so their presence cannot be mistaken for working infrastructure.

## Available Scripts

Run scripts from the repository root.

| Script | Purpose |
| --- | --- |
| `scripts/load-rbin-mappings.ps1` | Validate and load Organizational Unit mapping CSV files into PostgreSQL |
| `scripts/test-smoke.ps1` | Verify the running Next.js application, NestJS API, API proxy, and basic security boundaries |

The mapping loader requires `-FunctionCsv` and `-RangeCsv`. It reads `DATABASE_URL` from `apps/api/.env` unless explicitly supplied and locates `psql` from `-PsqlPath`, `PATH`, or installed PostgreSQL directories.

The mapping workflow is documented in [RBIN Namelist Cleaning](../docs/imports/RBIN_NAMELIST_CLEANING.md). The smoke gate is documented in [Cleanup Testing](../docs/operations/cleanup-testing.md).

## Deployment Status

Do not deploy from this directory until reviewed deployment configuration, reverse-proxy configuration, secret handling, backup automation, and recovery procedures are added.

The intended deployment controls and future Compose structure are described in [System Engineering and Deployment Guidelines](../docs/architecture/SYSTEM_ENGINEERING_AND_DEPLOYMENT_GUIDELINES.md).
