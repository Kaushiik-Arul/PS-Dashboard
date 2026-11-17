# PS Dashboard Web

Next.js application for PS Dashboard workforce, talent, attrition, employee, access, import, and reporting workflows.

## Responsibilities

- Render authenticated dashboard and administration experiences.
- Protect pages and mutation requests through `proxy.ts`.
- Expose browser-facing API routes under `app/api`.
- Forward authenticated requests to the NestJS API without exposing backend credentials or internal URLs to browser code.
- Organize reusable UI and domain behavior under `src/components` and `src/features`.

The web application does not access PostgreSQL directly.

## Configuration

Create a local `.env.local` from `.env.example` and configure:

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Server-side NestJS API URL, including `/api/v1` |

The development default is `http://127.0.0.1:3001/api/v1`. Production requires an explicit value. Local environment files are ignored by Git.

## Commands

Run commands from `apps/web`:

```powershell
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint checks |

The local application is available at `http://127.0.0.1:3000` unless another port is selected.

## Source Layout

| Path | Purpose |
| --- | --- |
| `app` | App Router pages, layouts, and browser-facing API routes |
| `src/features` | Domain UI, API clients, types, and feature behavior |
| `src/components` | Shared presentation components |
| `src/auth` | Shared authentication behavior |
| `public` | Static application assets |

Generated `.next` output is not source-controlled.

## Feature Documentation

- [Project features](../../PROJECT_FEATURES.md)
- [Namelist workflows](../../NAMELIST_IMPORT.md)
- [RBIN Namelist cleaning](../../RBIN_NAMELIST_CLEANING.md)
- [Management Review Meeting](../../MRM.md)
- [UI and UX principles](UI_UX_DESIGN_PRINCIPLES_v0.5.md)
- [Cleanup test gate](../../docs/cleanup-testing.md)

## Deployment

Repository deployment and system-engineering requirements are documented in [System Engineering and Deployment Guidelines](../../SYSTEM_ENGINEERING_AND_DEPLOYMENT_GUIDELINES.md).
