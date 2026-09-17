# Changes Needed for Next.js Engineering Guidelines

Version: 1.0  
Target document: `apps/web/NEXTJS_ENGINEERING_GUIDELINES.md`  
Applies to: `apps/web`  
Framework: Next.js 16 App Router with React 19 and TypeScript

## Purpose

This document lists the changes recommended before finalizing `NEXTJS_ENGINEERING_GUIDELINES.md`. The existing guideline already provides a strong foundation for application boundaries, component design, TypeScript usage, security, accessibility, testing, and maintainability.

## 1. Remove Rich-Text HTML Formatting

Remove copied HTML elements such as:

```html
<strong class="___1qwroh2 fl43uef f19n0e5" data-lexical-text="true">
# Next.js Engineering Guidelines
</strong>
<br><br>
```

Replace them with normal Markdown:

```md
# Next.js Engineering Guidelines
```

Do this for every heading and remove all `<br>` tags. Markdown already handles headings and paragraph spacing.

## 2. Use Consistent Heading Capitalization

Use sentence-style capitalization throughout the document.

Recommended headings:

```md
## 4. Route and Component Rules
## 5. Data Access and NestJS Integration
## 7. State and Business Logic
## 8. Authentication and Authorization
## 9. Errors, Loading, and Empty States
## 10. Accessibility and UI Consistency
## 11. Naming and Style
## 13. Definition of Done
## 14. Review Questions
```

## 3. Expand the Runtime Validation Rules

Replace:

> Treat all data received from the browser or NestJS as untrusted until it is validated.

With:

> Treat all data received across a runtime boundary, including browser input, API responses, environment variables, uploaded files, and third-party integrations, as untrusted until it is validated.

Add these rules under **TypeScript Rules** or **Data Access and NestJS Integration**:

```md
- TypeScript types provide compile-time safety but do not validate runtime data.
- Validate API responses at the Next.js data-access boundary when contract drift or invalid data would create significant risk.
- NestJS remains responsible for validating every incoming API request.
- Validate uploaded files, environment variables, route parameters, query parameters, form data, and third-party responses at their runtime boundaries.
```

## 4. Add Environment Configuration Rules

Add the following subsection under **Data Access and NestJS Integration**:

```md
### Environment Configuration

- Validate required environment variables during application startup.
- Keep server-only variables separate from variables intentionally exposed to the browser.
- Only variables explicitly intended for the browser may use the `NEXT_PUBLIC_` prefix.
- Never place secrets, credentials, private API URLs, or access tokens in public environment variables.
- Maintain an `.env.example` file containing variable names and safe placeholder values.
- Do not commit local, test, staging, or production `.env` files containing secrets.
- Access environment configuration through a validated configuration module instead of reading `process.env` throughout the application.
```

## 5. Define a Stable Application Error Model

Add a shared frontend error model:

```ts
export type ApplicationError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  correlationId?: string;
};
```

Add these rules under **Errors, Loading, and Empty States**:

```md
- Convert backend, validation, and network failures into a stable application error model.
- UI components must not depend directly on Fetch, NestJS, or database-specific error structures.
- Display safe and actionable messages to users.
- Preserve a correlation identifier for operational diagnosis when one is provided.
- Do not expose raw backend errors, exception details, stack traces, internal URLs, or sensitive values.
```

## 6. Add Import and Module-Boundary Rules

Add these rules under **Folder Structure** or **Naming and Style**:

```md
- Prefer the configured `@/` alias for imports that cross feature or shared-module boundaries.
- Use relative imports for modules within the same feature.
- A feature must not import another feature's internal components, utilities, or implementation modules.
- Cross-feature behavior must be exposed through an intentional public module or moved to a genuinely shared location.
- Do not create shared modules merely to shorten import paths.
- Avoid barrel files when they hide ownership, introduce circular dependencies, or increase client bundles unintentionally.
- Server-only modules must not be imported into Client Components.
```

## 7. Add Dependency and OSS Management Rules

Insert a new section before the testing strategy:

```md
## Dependency and OSS Management

- Prefer platform capabilities and existing approved dependencies before introducing a new package.
- Check the package license, maintenance status, security posture, internal availability, and actual project need before installation.
- Follow the applicable Bosch OSS review and approval process.
- Commit the package lockfile and keep it synchronized with `package.json`.
- Do not use floating dependency versions.
- Remove unused dependencies promptly.
- Do not introduce multiple libraries that solve the same problem without a documented reason.
- Review dependency updates before merging them into the project.
- Do not add a package solely to avoid writing a small, clear, and maintainable utility.
```

Renumber the sections that follow this new section.

## 8. Add Operational Logging and Sensitive-Data Rules

Add a dedicated section:

```md
## Operational Logging

- Use structured server-side logging for operational failures.
- Never log access tokens, session cookies, passwords, authorization headers, or secrets.
- Do not log complete employee records, uploaded files, or other sensitive HR data.
- Log only the minimum identifiers and context needed for diagnosis.
- Use correlation identifiers to connect frontend-facing failures with backend logs.
- Keep browser logging minimal and free of sensitive information.
- Remove temporary `console.log`, debugging output, and development diagnostics before completing a change.
```

## 9. Strengthen Mock-Data and Simulated-Authentication Rules

Extend the current mock-data guidance with:

```md
- Clearly label mock data, mock services, and simulation-only authentication.
- Keep mock implementations replaceable through the same interface expected from the real API layer.
- Mock data must remain feature-local unless it represents a reusable test fixture.
- Mock data must not be imported into production-only execution paths.
- Production builds must not silently fall back to mock HR data when an API request fails.
- Simulation controls such as the current role selector and `AuthProvider` must be excluded from production authentication flows.
- Use obviously synthetic values in mock employee records. Do not copy production employee data into fixtures.
```

## 10. Add API Contract and Data-Mapping Rules

Add these rules under **Data Access and NestJS Integration**:

```md
- Keep transport DTOs separate from presentation models when the UI requires a different shape.
- Perform DTO-to-view-model mapping in the feature data-access or mapping layer, not inside rendering code.
- Treat generated API types as contract definitions, not as proof that runtime data is valid.
- Do not allow components to construct API URLs or authentication headers directly.
- Centralize timeouts, approved headers, credentials behavior, and response normalization in the shared API layer.
- Avoid retrying non-idempotent operations automatically unless the behavior is explicitly designed and safe.
```

## 11. Add Security Rules for Browser and Server Boundaries

Add these rules under **Authentication and Authorization**:

```md
- Do not trust role, user, tenant, or permission values supplied by browser state.
- Do not use hidden controls, disabled buttons, route redirects, or Client Component checks as authorization enforcement.
- Protect server-only modules with `import "server-only"` when they access secrets, private configuration, or privileged APIs.
- Minimize sensitive data passed from Server Components to Client Components.
- Do not serialize secrets, tokens, internal error details, or unnecessary employee attributes into Client Component props.
- Validate redirect targets and other user-controlled navigation values before use.
```

## 12. Clarify Server and Client Component Boundaries

Add these practical checks under **Route and Component Rules**:

```md
Before adding `"use client"`, confirm that the module directly requires at least one of the following:

- React state or effects.
- Event handlers.
- Browser APIs.
- Client-only context.
- A third-party library that requires browser execution.

Keep data fetching, secret access, and privileged API calls on the server whenever browser execution is not required.
Do not move a parent component to the client merely to support one interactive child. Isolate the interactive child instead.
```

## 13. Add Data-Transformation Rules

Add these rules under **State and Business Logic**:

```md
- Keep parsing, normalization, comparison, filtering, and aggregation logic outside React components.
- Prefer deterministic pure functions for employee-data calculations and import comparisons.
- Do not mutate API responses, component props, or shared collections.
- Represent workflow states explicitly instead of combining several unrelated Boolean flags.
- Keep source data separate from derived display data.
- Document important domain assumptions close to the function or type that enforces them.
```

For finite workflows, prefer discriminated unions:

```ts
type ImportState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "preview"; summary: ImportSummary }
  | { status: "submitting"; summary: ImportSummary }
  | { status: "success"; importId: string }
  | { status: "error"; error: ApplicationError };
```

## 14. Add Code-Quality Commands

Add the following expectations to **Definition of Done**:

```md
The project must provide consistent commands for:

- `lint` for ESLint checks.
- `type-check` for TypeScript validation.
- `test` for automated tests.
- `build` for the production Next.js build.
- `check` for running the required validation sequence locally and in CI.
```

Example only, to be adapted to the approved project tooling:

```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "<approved-test-command>",
    "build": "next build",
    "check": "npm run lint && npm run type-check && npm run test && npm run build"
  }
}
```

Do not prescribe or install a testing package until it has passed the project's dependency and OSS review.

## 15. Expand the Definition of Done

Add these checks:

```md
- Runtime boundaries are validated where required.
- Environment variables are accessed through validated configuration.
- API and operational errors use the standard application error shape.
- No feature imports another feature's internal implementation.
- New dependencies have completed the applicable technical, security, license, and OSS checks.
- Logs contain no secrets or sensitive HR data.
- Mock data and simulated authorization cannot become silent production fallbacks.
- Relevant lint, type-check, test, and production-build commands pass.
```

## 16. Expand the Review Questions

Add the following questions:

```md
9. Is runtime data validated at the correct system boundary?
10. Could this change expose secrets or unnecessary employee data to the browser or logs?
11. Does this feature depend on another feature's internal implementation?
12. Is a new dependency necessary, approved, maintained, and safe to use?
13. Can development mock data or simulated authentication reach a production path?
14. Are API errors converted into the standard application error model?
15. Are the primary business rules covered by tests at the appropriate level?
```

## Recommended Final Section Order

After applying the changes, use this section order:

1. Core Principles
2. Application Boundaries
3. Folder Structure
4. Route and Component Rules
5. Data Access and NestJS Integration
6. TypeScript Rules
7. State and Business Logic
8. Authentication and Authorization
9. Errors, Loading, and Empty States
10. Accessibility and UI Consistency
11. Naming and Style
12. Dependency and OSS Management
13. Operational Logging
14. Testing Strategy
15. Definition of Done
16. Review Questions

## Finalization Checklist

- [ ] Remove all copied HTML formatting.
- [ ] Standardize heading capitalization.
- [ ] Expand runtime-boundary validation rules.
- [ ] Add environment configuration rules.
- [ ] Add a stable application error model.
- [ ] Define import and feature-module boundaries.
- [ ] Add dependency and Bosch OSS requirements.
- [ ] Add operational logging and HR-data protection rules.
- [ ] Strengthen mock-data and simulated-authentication restrictions.
- [ ] Add API contract and DTO mapping rules.
- [ ] Strengthen browser and server security boundaries.
- [ ] Clarify when `"use client"` is permitted.
- [ ] Add data-transformation rules.
- [ ] Define required code-quality commands.
- [ ] Expand the Definition of Done.
- [ ] Expand review questions.
- [ ] Renumber headings after inserting new sections.
- [ ] Review the completed document together with `UI_UX_DESIGN_PRINCIPLES_v0.5.md`.
