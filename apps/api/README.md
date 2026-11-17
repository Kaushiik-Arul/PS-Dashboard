# PS Dashboard API

NestJS backend for PS Dashboard workforce, talent, attrition, employee, access, import, and reporting workflows.

## Responsibilities

- Authenticate users and enforce role and workforce scope permissions.
- Serve the versioned REST API under `/api/v1`.
- Validate and process CSV and XLSX imports.
- Read and update PostgreSQL through repositories in `src/modules`.
- Publish development-only OpenAPI documentation at `/docs`.

The API does not serve the browser UI. Browser requests normally pass through the Next.js API routes in `apps/web`.

## Configuration

Create a local `.env` from `.env.example` and provide:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API listener port; defaults to `3001` |
| `DATABASE_URL` | PostgreSQL connection URL |

Local `.env` files are ignored by Git. Do not commit credentials.

## Commands

Run commands from `apps/api`:

```powershell
npm install
npm run start:dev
```

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Start the API in watch mode |
| `npm run build` | Compile production output to `dist` |
| `npm run start:prod` | Build and run the production entry point |
| `npm run lint` | Run type-aware Oxlint checks |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run API end-to-end tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run seed:access` | Seed an initial access account using local environment values |

Generated `dist` output is not source-controlled.

## Database

Schema migrations and database functions are stored in [`../sql`](../sql). Review migration prerequisites in [`../sql/README.md`](../sql/README.md) before applying them.

## Feature Documentation

- [Project features](../../docs/features/PROJECT_FEATURES.md)
- [Namelist workflows](../../docs/imports/NAMELIST_IMPORT.md)
- [RBIN Namelist cleaning](../../docs/imports/RBIN_NAMELIST_CLEANING.md)
- [Management Review Meeting](../../docs/features/MRM.md)
- [Security architecture](../../docs/architecture/SECURITY_ARCHITECTURE.md)
- [Cleanup test gate](../../docs/operations/cleanup-testing.md)

## Deployment

Repository deployment and system-engineering requirements are documented in [System Engineering and Deployment Guidelines](../../docs/architecture/SYSTEM_ENGINEERING_AND_DEPLOYMENT_GUIDELINES.md).
