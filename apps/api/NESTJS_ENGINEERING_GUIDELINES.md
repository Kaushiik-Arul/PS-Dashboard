# Changes Needed for NestJS Engineering Guidelines

**Version:** 1.0  
**Target document:** `apps/api/NESTJS_ENGINEERING_GUIDELINES.md`  
**Scope:** `apps/api`

## Purpose

This document lists the recommended changes before finalizing the NestJS engineering guideline. The existing baseline already establishes strong rules for domain ownership, validation, authorization, PostgreSQL access, errors, logging, testing, and dependency governance.

## 1. Remove rich-text HTML formatting

Remove copied HTML elements such as:

```html
<strong class="___1qwroh2 fl43uef f19n0e5" data-lexical-text="true">
## 1. Core principles
</strong>
<br><br>
```

Replace them with normal Markdown:

```md
## 1. Core principles
```

Also remove:

```html
<br aria-hidden="true">
```

Convert encoded characters:

```text
&lt;domain&gt;                         -> <domain>
Record&lt;string, string[]&gt;         -> Record<string, string[]>
```

## 2. Clarify module and persistence ownership

Replace:

> A module owns its domain behavior and persistence operations.

With:

> A module owns its domain behavior and the repository contracts required by that domain. Database infrastructure remains centralized, while persistence implementations remain associated with the owning domain.

This avoids creating separate database infrastructure inside every feature while preserving clear domain ownership.

## 3. Add API versioning rules

Add under **Controllers and transport**:

```md
- Select one API versioning strategy and apply it consistently.
- Do not create a new API version for backward-compatible additions.
- Document deprecation and removal expectations before introducing an incompatible contract change.
- Keep all supported API versions represented accurately in OpenAPI.
- Do not remove or rename response fields without reviewing existing consumers.
```

## 4. Add pagination, filtering, and sorting rules

Add under **Controllers and transport** or **Data access and PostgreSQL**:

```md
- List endpoints must use bounded pagination.
- Define and enforce a maximum page size at the API boundary.
- Allow filtering and sorting only on approved fields.
- Validate page values, page sizes, sort fields, sort directions, and filter values.
- Use a consistent pagination response structure.
- Do not expose arbitrary database column names through public query parameters.
- Ensure filters affecting sensitive employee data are authorized as well as validated.
```

Suggested response structure:

```ts
export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
```

## 5. Strengthen transaction and idempotency rules

Add under **Data access and PostgreSQL**:

```md
- Define transaction ownership at the service or use-case boundary.
- A transaction must cover the complete business operation when partial completion would create an invalid state.
- Do not keep database transactions open while calling slow or unreliable external systems.
- Retried commands must not create duplicate records, duplicate imports, or duplicate audit events.
- Use an explicit idempotency strategy for operations that clients or infrastructure may safely retry.
- Make transaction rollback behavior observable and test it for high-risk workflows.
```

## 6. Add bulk employee import rules

Add a dedicated section:

```md
## Bulk Data Import

- Separate upload, parsing, validation, normalization, preview, confirmation, and persistence.
- Preview operations must not update production employee records.
- Validate file type, size, required columns, duplicate identifiers, field formats, and reference mappings.
- Treat spreadsheet and CSV formulas, paths, names, and cell contents as untrusted input.
- Keep row-level validation errors actionable without exposing sensitive values unnecessarily.
- Compare normalized source data against the approved existing dataset.
- Apply confirmed changes through a controlled transaction when partial completion would corrupt business state.
- Record import status, source period, initiator, timestamps, summary counts, and audit references.
- Define how interrupted and retried imports are detected and handled.
- Do not retain uploaded files longer than the approved operational requirement.
- Do not log complete uploaded files or complete employee records.
```

## 7. Add concurrency-control rules

Add under **Data access and PostgreSQL**:

```md
- Identify workflows that can be modified concurrently.
- Use database constraints, transactional checks, optimistic concurrency, or locking where appropriate.
- Do not rely only on a read-then-write application check for uniqueness or critical invariants.
- Define the expected API response when concurrent operations conflict.
- Keep lock scope and transaction duration as small as the business operation safely permits.
- Test relevant concurrent-update and duplicate-submission scenarios.
```

## 8. Expand database migration rules

Add under **Data access and PostgreSQL**:

```md
- Migrations must be deterministic, reviewed, and executable through the approved deployment process.
- Do not modify a migration after it has been applied to a shared environment.
- Avoid combining destructive schema changes with application releases that still depend on the previous schema.
- Use staged expand-and-contract migrations for incompatible changes.
- Define rollback or forward-recovery steps for production migrations.
- Test migrations using representative schemas and data volumes.
- Review the locking, runtime, storage, and compatibility impact of high-risk migrations.
- Automatic production schema synchronization is prohibited.
```

## 9. Add request-protection rules

Add under **Authentication and authorization** or create a security subsection:

```md
- Configure explicit request-body and uploaded-file size limits.
- Rate-limit authentication, upload, export, and other abuse-sensitive endpoints where required.
- Configure CORS through an explicit allowlist. Do not combine unrestricted origins with credentials.
- Apply approved security headers at the application or reverse-proxy boundary.
- Do not accept unrestricted file names, storage paths, MIME types, or payload sizes.
- Validate redirect targets and callback URLs before use.
- Reject unsupported content types for endpoints with defined payload formats.
```

## 10. Add module dependency rules

Add under **Application structure**:

```md
- Avoid circular dependencies between feature modules.
- Do not use `forwardRef` as the default solution for unclear ownership.
- A module must export only the providers required by documented consumers.
- A module must not import another module's internal files directly.
- Shared infrastructure modules must not become containers for unrelated business behavior.
- Cross-domain workflows should use an intentional orchestration service when no single domain owns the complete operation.
```

## 11. Add API contract mapping rules

Add under **Controllers and transport**:

```md
- Keep request DTOs, response DTOs, domain models, and persistence entities separate when they serve different responsibilities.
- Map transport data at the application boundary rather than inside persistence entities.
- Return only fields required by the consumer.
- Generated OpenAPI types define compile-time contracts but do not replace runtime validation.
- Do not expose authorization, audit, or internal persistence fields merely because they exist on an entity.
```

## 12. Strengthen audit rules

Add under **Logging, audit, and observability**:

```md
- Define which business operations require audit events.
- Audit records should include the actor, action, target reference, outcome, timestamp, and correlation identifier where applicable.
- Keep audit records append-oriented and protected from ordinary application modification.
- Do not store secrets or unnecessary before-and-after employee records in audit events.
- Record authorization failures and security-sensitive administrative actions according to the approved policy.
- Define retention and access controls for audit data.
```

## 13. Add health-check rules

Add under **Logging, audit, and observability**:

```md
- Liveness indicates whether the process should be restarted.
- Readiness indicates whether the API can safely receive traffic.
- Dependency checks must use bounded timeouts.
- Health endpoints must not expose credentials, internal URLs, environment values, or sensitive diagnostics.
- Keep health checks lightweight and avoid excessive database load.
- A process-level health response must not be treated as proof that migrations and application data contracts are correct.
```

## 14. Add code-quality commands

Add before **Definition of done**:

```md
## Code Quality Commands

The API project must provide consistent commands for:

- `lint` for ESLint checks.
- `type-check` for TypeScript validation.
- `test` for unit tests.
- `test:integration` for database and integration tests.
- `test:e2e` for critical API workflows where applicable.
- `build` for the production NestJS build.
- `check` for the required local and CI validation sequence.

The exact test and quality packages remain subject to the applicable dependency, security, license, and Bosch OSS review.
```

## 15. Expand the definition of done

Add:

```md
- Runtime input is validated at every relevant trust boundary.
- Pagination and list limits are bounded where applicable.
- Transaction, retry, concurrency, and idempotency behavior have been considered.
- Bulk-import preview paths cannot update production records.
- Migrations include compatibility and recovery considerations.
- Module changes do not introduce circular or internal cross-module dependencies.
- Audit behavior is implemented for security-sensitive and HR-sensitive operations where required.
- Request size, upload, CORS, and abuse-protection requirements have been reviewed.
- Relevant lint, type-check, test, integration, end-to-end, and production-build commands pass.
```

## 16. Add review questions

```md
## Review Questions

1. Which domain module owns this behavior?
2. Is business logic independent from HTTP and persistence concerns?
3. Is every runtime input validated at the correct boundary?
4. Is authorization enforced for both the operation and the requested records?
5. Does the response expose only the employee data required by the consumer?
6. Is the transaction boundary aligned with the complete business operation?
7. Can retries or concurrent requests create duplicates or inconsistent state?
8. Are pagination, filtering, and sorting bounded and approved?
9. Are errors stable and safe for API consumers?
10. Are logs and audit events free of secrets and unnecessary HR data?
11. Does the change require a migration, compatibility period, rollback, or forward-recovery plan?
12. Is a new dependency necessary, maintained, secure, licensed, and approved?
13. Does OpenAPI accurately describe the implemented contract?
14. Are the highest-risk business, authorization, import, and concurrency paths tested?
15. Can the operation be diagnosed using safe logs, metrics, and correlation identifiers?
```

## Recommended final section order

1. Core principles
2. Application structure
3. Controllers and transport
4. Validation
5. Business logic
6. Authentication and authorization
7. Data access and PostgreSQL
8. Bulk data import
9. Errors and API responses
10. Configuration and secrets
11. Logging, audit, and observability
12. Dependencies
13. Testing
14. Code quality commands
15. Definition of done
16. Review questions

## Finalization checklist

- [ ] Remove HTML and decode escaped Markdown characters.
- [ ] Clarify domain repository ownership.
- [ ] Add API versioning rules.
- [ ] Add bounded pagination, filtering, and sorting.
- [ ] Define transaction and idempotency expectations.
- [ ] Add bulk employee import rules.
- [ ] Add concurrency-control rules.
- [ ] Expand migration safety rules.
- [ ] Add request-size, upload, CORS, and abuse controls.
- [ ] Add module dependency rules.
- [ ] Add DTO and contract mapping rules.
- [ ] Strengthen audit requirements.
- [ ] Define liveness and readiness behavior.
- [ ] Add standard code-quality commands.
- [ ] Expand the definition of done.
- [ ] Add review questions.
- [ ] Renumber all sections after insertion.
