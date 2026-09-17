# Changes Needed for System Engineering and Deployment Guidelines

**Version:** 1.0  
**Target document:** `SYSTEM_ENGINEERING_AND_DEPLOYMENT_GUIDELINES.md`  
**Scope:** Entire repository and deployed system

## Purpose

This document lists the recommended changes before finalizing the system engineering and deployment guideline for the Next.js, NestJS, PostgreSQL, reverse-proxy, Docker Compose, and VM deployment architecture.

## 1. Remove rich-text HTML formatting

Remove copied HTML elements such as:

```html
<strong class="___1qwroh2 fl43uef f19n0e5" data-lexical-text="true">
## 1. System boundaries
</strong>
<br><br>
```

Also remove:

```html
<br aria-hidden="true">
```

Convert encoded arrows:

```text
Browser -&gt; Reverse proxy -&gt; Next.js
```

To:

```text
Browser -> Reverse proxy -> Next.js
```

## 2. Clarify the initial deployment model

Add after the introduction:

```md
## Deployment Model

The initial production target is a single approved VM running Docker Compose.

This model prioritizes operational simplicity. It does not provide automatic multi-host failover or horizontal orchestration. If availability, scale, recovery, or geographic requirements exceed the capabilities of a single VM, the architecture must be reviewed before production expansion.

Production hosting, network access, identity, backup, monitoring, and security controls remain subject to applicable organizational approval and platform requirements.
```

## 3. Expand the system-boundary diagram

Replace:

```text
Browser -> Reverse proxy -> Next.js -> NestJS -> PostgreSQL
```

With:

```text
User Browser
    |
    | HTTPS
    v
Reverse Proxy
    |
    +--> Next.js Web
              |
              | Internal HTTP
              v
         NestJS API
              |
              | Private database connection
              v
         PostgreSQL
```

Add:

```md
- Only the reverse proxy may publish production HTTP and HTTPS ports.
- Next.js, NestJS, and PostgreSQL communicate through private container networks.
- Administrative VM access must remain separate from normal application traffic.
- Direct public access to Next.js, NestJS, PostgreSQL, monitoring tools, and administration interfaces is prohibited.
```

## 4. Separate shared, development, and production Compose configuration

Recommended structure:

```text
infra/
|-- compose.yaml
|-- compose.development.yaml
|-- compose.production.yaml
|-- proxy/
|-- scripts/
`-- environments/
    `-- README.md
```

Add:

```md
- Keep shared service definitions in `compose.yaml`.
- Keep development-only port bindings, source mounts, and debugging configuration in `compose.development.yaml`.
- Keep production restart policies, image references, resource settings, logging, and network exposure in `compose.production.yaml`.
- Production configuration must not include source-code bind mounts, development commands, or debugging ports.
- Validate and review the fully resolved Compose configuration before deployment.
```

Example validation command:

```bash
docker compose \
  -f infra/compose.yaml \
  -f infra/compose.production.yaml \
  config
```

## 5. Add Compose trust and privilege rules

Add under **Container rules**:

```md
- Treat Compose files and included configuration as privileged infrastructure code.
- Review infrastructure changes using the same controls as application and deployment code.
- Inspect the resolved Compose configuration before production deployment.
- Do not use `privileged: true` unless an approved and documented requirement exists.
- Avoid host networking, host PID namespaces, Docker socket mounts, unnecessary host bind mounts, and additional Linux capabilities.
- Drop unnecessary Linux capabilities where supported.
- Use read-only container filesystems where the application supports them.
- Mount required writable temporary directories explicitly.
- Do not use unreviewed remote Compose includes or extensions.
```

## 6. Strengthen secret handling

Expand **Environment and secrets**:

```md
- Prefer an approved secret manager when one is available.
- When Compose secrets are used, grant each service access only to the secrets it requires.
- Mount secrets as files instead of placing sensitive values in general-purpose environment variables where supported.
- Never store secret source files in the repository.
- Do not print resolved environment configuration during deployment or diagnostics.
- Define ownership, rotation, expiry, and emergency revocation for every production secret.
- Ensure backups, logs, support bundles, and diagnostic archives do not capture secret files.
- Do not assume standalone Compose secrets provide the same guarantees as an orchestrated secret-management platform.
```

## 7. Add release identity and image provenance rules

Add under **Deployment process**:

```md
- Assign every release a unique release identifier.
- Record the Git commit, CI run, image digest, migration version, deployment environment, timestamp, and operator identity.
- Reference immutable image digests or uniquely immutable tags in production deployments.
- Verify that the deployed image is the same artifact that passed the required CI checks.
- Do not rebuild an approved release separately for each environment.
- Promote the same approved image through staging and production while changing only environment-specific configuration.
- Retain sufficient release metadata to support investigation and rollback.
```

## 8. Separate application, migration, backup, and administrative identities

Add under **Database lifecycle**:

```md
- The NestJS runtime database identity must not have schema-migration permissions unless explicitly required and approved.
- Use a dedicated migration identity for schema changes.
- Use a dedicated backup identity with only the permissions required for backup operations.
- Keep application, migration, backup, and administrative database credentials separate.
- Do not place PostgreSQL superuser credentials in the normal application runtime environment.
- Rotate and revoke database identities independently.
```

## 9. Clarify availability and zero-downtime claims

Add under **Deployment process**:

```md
- Do not claim zero-downtime deployment unless the infrastructure and procedure have been tested to provide it.
- Replacing a single application instance may create a service interruption.
- During a deployment window, migrations must remain compatible with both the currently running application and the incoming application when required.
- Destructive cleanup must occur only after the older application is no longer used and rollback compatibility is no longer required.
- Define the acceptable maintenance window and user-communication process where interruption cannot be avoided.
```

## 10. Expand backup and restoration rules

Add under **Database lifecycle**:

```md
- Define recovery point and recovery time objectives before production launch.
- Encrypt backup data in transit and at rest according to organizational requirements.
- Restrict backup access independently from normal application access.
- Verify backup completion and integrity automatically where supported.
- Test restoration into an isolated environment.
- Record restore-test outcomes and corrective actions.
- Include database roles, schema objects, extensions, and required configuration in recovery planning.
- Define how backups are handled when employee-data deletion or retention requirements apply.
- Do not treat a named Docker volume, VM snapshot alone, or replica alone as a complete backup strategy.
```

## 11. Add deployment failure gates

Add under **Deployment process**:

```md
A deployment must stop when:

- Required configuration validation fails.
- The approved image or immutable release identity cannot be verified.
- A required pre-deployment backup prerequisite fails.
- A migration fails or produces an unexpected state.
- Required readiness checks do not pass.
- The critical-path smoke test fails.
- Required logging or monitoring becomes unavailable.

Additional rules:

- Deployment scripts must return non-zero exit codes on failure.
- Deployment success must not be recorded until health and smoke-test gates pass.
- A partial deployment must trigger the documented rollback or recovery path.
- Manual overrides must be approved, recorded, and followed by corrective action.
```

## 12. Distinguish liveness, readiness, and dependency health

Add under **Availability and operations**:

```md
- Liveness indicates whether a process should be restarted.
- Readiness indicates whether a service can safely receive traffic.
- Dependency checks must use bounded timeouts.
- PostgreSQL container health does not prove that the application schema, credentials, migrations, or business queries are correct.
- Health endpoints must not expose configuration, credentials, dependency URLs, or sensitive diagnostic details.
- Health checks must be lightweight and must not create excessive database load.
- The reverse proxy must route traffic only to ready application instances where the selected deployment setup supports it.
```

## 13. Add resource, logging, and disk-protection rules

Add under **Availability and operations**:

```md
- Configure container log rotation or an approved centralized logging driver.
- Monitor PostgreSQL data, container logs, temporary uploads, generated reports, image layers, and backup staging for disk growth.
- Remove superseded images through a controlled cleanup procedure.
- Define safe CPU, memory, process-count, and temporary-storage limits after observing representative usage.
- Configure application and database connection limits consistently with VM capacity.
- Prevent uploads, exports, reports, and temporary files from consuming unbounded local storage.
- Define the operating response when the VM approaches disk, memory, CPU, or connection exhaustion.
- Alert thresholds must have an owner and documented response procedure.
```

## 14. Add network segmentation rules

Recommended logical networks:

```text
public network:
reverse proxy <-> Next.js

application network:
Next.js <-> NestJS

database network:
NestJS <-> PostgreSQL
```

Add:

```md
- Attach each service only to the networks it requires.
- The reverse proxy must not join the database network.
- PostgreSQL must not join the public network.
- Next.js must not join the database network.
- NestJS is the only application service permitted to access PostgreSQL.
- Do not use `network_mode: host` without an approved and documented requirement.
- Do not publish internal service ports merely for operational convenience.
```

## 15. Add production access and change-management rules

Add a dedicated section:

```md
## Production Access and Change Management

- Grant production access only to approved identities with a documented operational need.
- Use individual identities instead of shared administrator accounts.
- Record production deployments and security-relevant administrative actions.
- Do not modify application files, containers, database schemas, or configuration manually outside the approved process.
- Emergency changes must be documented and reconciled into source-controlled configuration.
- Remove access promptly when it is no longer required.
- Periodically review VM, registry, CI, database, backup, and secret-management access.
- Define ownership and escalation paths for infrastructure, application, database, security, and backup incidents.
```

## 16. Add environment and test-data isolation rules

Add a dedicated section:

```md
## Environment and Test Data Isolation

- Production and non-production environments must use separate credentials and data stores.
- Do not copy production HR data into development or test environments unless explicitly approved and protected.
- Prefer synthetic data for development, testing, demonstrations, training, and screenshots.
- Environment names and visual indicators should make production clearly distinguishable.
- Automated tests must not target production services.
- Development fallback behavior must not silently activate in production.
- Test accounts, mock authentication, and dummy role selectors must not be available in production paths.
```

## 17. Add rollback decision rules

Add under **Deployment process**:

```md
- Define which failures trigger application rollback, database recovery, forward correction, or incident escalation.
- Do not automatically roll back an application when a non-reversible migration makes the previous version incompatible.
- Verify rollback compatibility before each release.
- Keep the previous approved application image available for the defined rollback period.
- Record rollback execution and validate system health after recovery.
```

## 18. Expand the production readiness checklist

Add:

```md
- [ ] The approved hosting model and VM ownership are documented.
- [ ] The limitations of the single-VM model are understood.
- [ ] The resolved production Compose configuration has been reviewed.
- [ ] Containers do not use unnecessary privileges, capabilities, host networking, or Docker socket access.
- [ ] Runtime, migration, backup, and administrative identities are separated.
- [ ] Release identity connects the Git commit, CI run, image digest, and migration version.
- [ ] Production and non-production credentials and data are isolated.
- [ ] Deployment failure gates are automated where supported.
- [ ] Liveness and readiness behavior is documented and tested.
- [ ] Log rotation and disk-exhaustion controls are active.
- [ ] Secret rotation and emergency revocation procedures are documented and tested where required.
- [ ] Recovery objectives are documented.
- [ ] The restore procedure has been successfully tested in isolation.
- [ ] Production access has an owner and review procedure.
- [ ] Rollback and forward-recovery decision paths are documented.
- [ ] Required organizational security, privacy, compliance, and OSS reviews are complete.
```

## Recommended final section order

1. System boundaries
2. Deployment model
3. Repository structure
4. Incremental Docker Compose plan
5. Container rules
6. Environment and secrets
7. Networking and TLS
8. Database lifecycle
9. Deployment process
10. Availability and operations
11. Security and privacy
12. Production access and change management
13. Environment and test data isolation
14. Production readiness checklist

## Finalization checklist

- [ ] Remove all copied HTML and decode escaped characters.
- [ ] State the initial single-VM deployment model and limitations.
- [ ] Expand the architecture diagram and public exposure rules.
- [ ] Separate shared, development, and production Compose configuration.
- [ ] Add Compose trust and container privilege controls.
- [ ] Strengthen secret handling and rotation rules.
- [ ] Add immutable release identity and image provenance.
- [ ] Separate runtime, migration, backup, and administrator identities.
- [ ] Clarify availability and zero-downtime claims.
- [ ] Expand backup, restore testing, and recovery objectives.
- [ ] Add automated deployment failure gates.
- [ ] Distinguish liveness, readiness, and dependency health.
- [ ] Add resource, log, upload, and disk-growth controls.
- [ ] Add network segmentation.
- [ ] Add production-access and change-management controls.
- [ ] Add environment and test-data isolation.
- [ ] Add rollback and forward-recovery decision rules.
- [ ] Expand the production-readiness checklist.
- [ ] Renumber all sections after insertion.
