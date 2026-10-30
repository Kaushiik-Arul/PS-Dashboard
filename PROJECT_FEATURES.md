# PS Dashboard - Detailed Module and Feature Guide

## 1. Document Purpose

This document consolidates the implemented modules and features of PS Dashboard for project presentations, demonstrations, onboarding, and solution reviews. It is based on the current web application, API controllers and services, database migrations, and project documentation.

PS Dashboard is a workforce intelligence and HR operations platform. It combines workforce analytics, employee profiles, talent and succession management, attrition analysis, organization hierarchy, monthly management reporting, controlled data imports, and role-based access administration.

## 2. Platform Summary

The solution consists of:

- A Next.js web application that provides dashboards, operational forms, import previews, and reports.
- A NestJS API that performs authentication, authorization, workforce scoping, validation, calculations, and transactional data updates.
- PostgreSQL storage for workforce data, imports, reporting snapshots, accounts, access assignments, sessions, and audit records.
- A same-origin web/API integration layer that keeps browser requests within the application domain.

The main navigation contains:

1. Overview
2. Demographics
3. Employee 360
4. Talent Landscape
5. Succession Planning
6. Attrition
7. HRBP Point
8. Access Point
9. MRM
10. Org Structure

Navigation items are shown according to the signed-in user's permissions.

---

## 3. User Roles and Access Model

### 3.1 Supported Roles

The application supports these business roles:

- **HRBP**: Full workforce visibility, operational data management, imports, reporting management, account administration, and application-provided exports.
- **Admin**: Organization-wide dashboard access and custom Overview configuration without HRBP data-maintenance privileges.
- **Range Head**: Read-only workforce access limited to assigned Range scope.
- **Department Head**: Read-only workforce access limited to one or more assigned Organizational Units within a Range.
- **Sub-Department Head**: Read-only workforce access limited to the assigned Range and Organizational Unit.

### 3.2 Permission-Based Navigation

The web application dynamically hides modules that the current role cannot access. The API independently enforces the corresponding permissions, so hidden navigation is a usability feature rather than the security boundary.

Examples:

- HRBP Point, Access Point, and Org Structure are HRBP-only modules.
- Employee 360, Talent Landscape, Succession Planning, Attrition, and MRM are available to authorized management roles.
- Custom Overview is available to HRBP and Admin.
- MRM editing and finalization are restricted to HRBP; other authorized roles receive read-only reports.
- CSV download controls are restricted to HRBP.

### 3.3 Workforce Scope

The application derives workforce scope from access assignments maintained in Access Point.

- HRBP has unrestricted workforce scope.
- Admin has unrestricted dashboard visibility but no workforce editing permissions.
- Range Heads are limited to assigned Ranges.
- Department and Sub-Department Heads are limited to assigned Range and Organizational Unit combinations.
- An account can hold multiple assignments, allowing access to multiple Organizational Units.
- Scope restrictions are applied by the API when data is queried, not merely by frontend filters.

Relevant implementation:

- [Web permission matrix](apps/web/src/auth/permissions.ts)
- [Application navigation](apps/web/src/components/AppShell.tsx)
- [API authorization](apps/api/src/common/authorization/permissions.ts)

---

## 4. Custom Overview Module

**Route:** `/overview`  
**Primary users:** HRBP and Admin

### 4.1 Business Purpose

Custom Overview gives leaders a personalized executive dashboard. Instead of forcing every user to consume the same fixed report, it allows each user to select the KPIs and charts most relevant to their responsibilities.

### 4.2 Widget Library

Users can select widgets from two domains:

#### Demographics KPIs

- Total headcount
- Direct headcount
- Indirect headcount
- Female percentage
- Average age
- Average tenure
- Retirement within three years
- Maternity
- Sabbatical
- CRL

#### Demographics Charts

- Headcount by organizational level
- Gender distribution
- Headcount by function
- Headcount by location
- Age profile
- Tenure profile
- Workforce status
- Retirement analysis

#### Succession Planning KPIs

- Total positions
- Successor 1 readiness: Ready now
- Successor 1 readiness: Ready in 1-2 years
- Successor 1 readiness: Ready in 3-4 years
- Successor 1 readiness: Ready later or TBD
- Successor 2 readiness across the same categories

#### Succession Planning Charts

- Positions by criticality
- Expected incumbent change

### 4.3 Dashboard Personalization

Users can:

- Enter customization mode.
- Add or remove widgets.
- Reorder KPI widgets separately from chart widgets.
- Reorder using drag interaction or accessible move controls.
- Reset the selection to the default layout.
- Save the layout as an account-specific preference.
- Cancel unsaved layout changes.

### 4.4 Filtering and Drill-Down

- Workforce filters include Function, Organizational Unit, Range, Location, Gender, and Direct/Indirect employment classification.
- Filter options update dynamically based on other selections.
- Clicking supported KPIs opens the underlying employee details.
- Filters are represented in the URL, supporting repeatable and shareable views.

Relevant implementation:

- [Custom Overview dashboard](apps/web/src/features/custom-overview/CustomOverviewDashboard.tsx)
- [Widget catalog](apps/web/src/features/custom-overview/custom-overview.catalog.ts)
- [Dashboard preferences API](apps/api/src/modules/dashboard-preferences/dashboard-preferences.controller.ts)

---

## 5. Demographics Module

**Route:** `/`  
**Primary users:** All authenticated roles within authorized scope

### 5.1 Business Purpose

The Demographics dashboard provides the central workforce composition view. It converts the employee namelist into current and historical workforce KPIs, charts, and employee-level detail.

### 5.2 Workforce KPIs

The dashboard calculates:

- Total headcount
- Direct headcount
- Indirect headcount
- Female workforce percentage
- Average employee age
- Average tenure
- Employees reaching retirement within three years
- Employees on maternity status
- Employees on sabbatical status
- Employees on CRL status

Each KPI displays its value and reporting context, such as the current dataset or selected reporting month.

### 5.3 Workforce Composition Visualizations

- **Headcount by Function:** Horizontal comparison across business functions.
- **Gender Distribution:** Donut visualization with workforce total.
- **Headcount by Level:** Joined funnel-style view of workforce levels.
- **Headcount by Location:** India location map showing employee distribution by site.

### 5.4 Workforce Profile and Movement

- **Age Profile:** Headcount by age band.
- **Tenure Profile:** Headcount by completed years of service.
- **Workforce Status:** Current-period workforce movement by employee group.
- **Retirement Analysis:** Employee retirement-risk details.

### 5.5 Reporting Periods

The dashboard supports:

- Current live workforce data.
- Detailed recent reporting months.
- Archived organization-level snapshots for older reporting periods.
- Read-only behavior when an archived snapshot is selected.

### 5.6 Filtering

Users can filter by:

- Function
- Organizational Unit
- Range
- Location
- Gender
- Direct/Indirect classification

Filters use multi-select controls and dependent option refresh, preventing users from selecting combinations that no longer exist in the selected scope.

Relevant implementation:

- [Demographics dashboard](apps/web/src/features/overview/OverviewDashboardView.tsx)
- [Overview API](apps/api/src/modules/overview/overview.controller.ts)

---

## 6. Employee 360 Module

**Routes:** `/employee-360` and `/employee-360/[persNo]`  
**Primary users:** Authorized management roles; HRBP has edit permissions

### 6.1 Business Purpose

Employee 360 creates a consolidated employee record from namelist, organizational, career, performance, talent, development, succession, and job-description data.

### 6.2 Employee Directory

The directory provides:

- Search by personnel number or employee name.
- Workforce-scope enforcement.
- Filters for Function, Organizational Unit, Range, Location, Gender, and Direct/Indirect classification.
- Employee-level table filters, including text searches, selections, and date ranges.
- Pagination and full-screen table mode.
- HRBP CSV download of the currently filtered rows.
- A direct action to open each employee profile.
- Exclusion of the signed-in user's own record from the result set.

### 6.3 Employee Profile

The profile displays:

#### Identity and Contact

- Personnel number
- Employee name
- NT ID
- Global ID
- Official email

#### Current Organization

- PS Group
- Range
- Organizational Unit
- Location
- Function
- Cost center
- Employee group
- Direct/Indirect classification

#### HR Partnership

- Primary HRBP Global ID
- Secondary HRBP Global ID

#### Career Information

- Date of joining
- Technical entry date
- Retirement entry date
- Birth date
- Designation
- Gender

#### Current Job Description

- JD ID
- JD role name
- HRBP-controlled reassignment with an effective date
- JD lookup by the final three digits of the JD ID

### 6.4 Career Journey

The Career Journey timeline combines imported and manually maintained history:

- Entry into PS
- Internal PS changes
- Organizational area movement
- Organizational Unit movement
- PS Group movement
- Job-description changes
- Notes and effective month/date

Authorized HRBP users can add, edit, and delete manual career events. Imported or system-derived events can be made read-only to preserve source history.

### 6.5 Employee Portfolio Panels

The profile also consolidates:

- Talent Pool portfolio
- Development Pool portfolio
- STEP availability and assignments
- PPP performance history
- Succession Planning portfolio as incumbent or successor
- IDP status

Authorized HRBP users can update STEP availability and IDP status directly from the profile.

Relevant implementation:

- [Employee directory](apps/web/src/features/employee-360/Employee360Dashboard.tsx)
- [Employee profile](apps/web/src/features/employee-360/EmployeeProfileView.tsx)
- [Career Journey](apps/web/src/features/employee-360/CareerJourneyPanel.tsx)
- [Employee 360 API](apps/api/src/modules/employee-360/employee-360.controller.ts)

---

## 7. Talent Landscape Module

**Routes:** `/talent-pipeline/talent-pool` and `/talent-pipeline/development-pool`  
**Primary users:** Authorized management roles; HRBP manages registers

### 7.1 Business Purpose

Talent Landscape provides organization-wide visibility into the active talent pipeline, employee development pools, nomination health, expiration exposure, and STEP opportunities.

### 7.2 Talent Pool Dashboard

#### Talent Pool KPIs

- Total Talent Pool
- Active Talent Pool
- Passive Talent Pool
- Memberships expiring within six months
- Memberships expiring within twelve months

KPI comparison values show both the percentage of workforce headcount and the percentage of the relevant pool.

#### Visualizations

- Talent Pool distribution by pool level
- Active versus Passive distribution
- TAR or nomination status distribution using Green, Amber, and Red status
- Gender composition
- Range composition

#### Operational Registers

- Available Talent register
- Active STEP register
- Talent Pool register

HRBP users can add, edit, delete, and bulk-import register records. Other authorized roles receive scoped read-only views.

### 7.3 Development Pool Dashboard

#### Development Pool KPIs

- Total Development Pool
- Female talent
- Key to retain
- Future talent
- Change wanted

#### Visualization

- Development Pool category distribution

#### Operational Register

- Development Pool employee register with HRBP manual maintenance and bulk import.

### 7.4 Historical Snapshots

HRBP can save monthly organization-wide snapshots for both Talent and Development views. Users with historical access can select a reporting month and view the frozen KPI/chart results. Snapshot views disable live operational register editing.

### 7.5 Filtering

Both dashboards support workforce filters for Function, Organizational Unit, Range, Location, Gender, and Direct/Indirect classification.

Relevant implementation:

- [Talent Landscape dashboard](apps/web/src/features/talent-pipeline/TalentPipelineDashboard.tsx)
- [Talent Landscape API](apps/api/src/modules/talent-pipeline/talent-pipeline.controller.ts)
- [Pool register API](apps/api/src/modules/hrbp-point/pool-register/pool-register.controller.ts)

---

## 8. Succession Planning Module

**Route:** `/succession-planning`  
**Primary users:** Authorized management roles; HRBP imports and manages source data

### 8.1 Business Purpose

Succession Planning evaluates position coverage, successor readiness, critical-role exposure, and anticipated incumbent movement.

### 8.2 Successor Readiness

The dashboard independently summarizes primary and secondary successors:

- Ready now
- Ready in 1-2 years
- Ready in 3-4 years
- Ready later or TBD

Each KPI shows the number of assignments and percentage of total positions.

### 8.3 Readiness Drill-Down

Selecting a readiness KPI opens its matching assignments. The drill-down includes:

- Employee number
- Employee name
- Department
- Current JD ID
- Target JD ID
- Target JD name
- 9-box rating
- IDP status

The drill-down can be searched by employee, department, JD, rating, or IDP status.

### 8.4 Succession Analytics

- Total positions
- Position distribution by criticality
- Expected incumbent changes by year
- Primary and secondary successor coverage

### 8.5 Position Register

The detailed register supports grouped columns, table filters, pagination, full-screen mode, and HRBP CSV download. It contains position, incumbent, successor, readiness, JD, rating, and IDP information.

### 8.6 Monthly History

HRBP can save organization-wide monthly Succession Planning snapshots. Historical snapshots are selectable by reporting month and presented as read-only.

Relevant implementation:

- [Succession Planning dashboard](apps/web/src/features/succession-planning/SuccessionPlanningDashboard.tsx)
- [Succession Planning API](apps/api/src/modules/succession-planning/succession-planning.controller.ts)

---

## 9. Attrition Module

**Route:** `/attrition`  
**Primary users:** Authorized management roles; HRBP imports source records

### 9.1 Business Purpose

The Attrition dashboard provides a controlled view of employee exits, transfer categories, workforce attrition rate, and approved separation reasons.

### 9.2 Attrition KPIs

- Total Attrition
- Resignations
- Transfers
- Retirements
- Female Attrition

KPIs include comparison against average headcount and total attrition where applicable.

### 9.3 Analytics

- **Attrition Trend:** Monthly exit count displayed with monthly attrition percentage.
- **Attrition by Reason:** Most frequent approved separation reasons.

### 9.4 Filters

- Reporting year
- Separation type
- Reason for action
- Range, when the user's role allows it
- Organizational Unit, when the user's role allows it

Filter options update based on the active selection and authorized scope.

### 9.5 Attrition Register

The detailed register includes employee separation records, grouped filters, pagination, full-screen mode, and HRBP CSV download.

Relevant implementation:

- [Attrition dashboard](apps/web/src/features/attrition/AttritionDashboard.tsx)
- [Attrition API](apps/api/src/modules/attrition/attrition.controller.ts)

---

## 10. Organization Structure Module

**Route:** `/org-structure`  
**Primary users:** HRBP

### 10.1 Business Purpose

Org Structure converts imported role relationships into an interactive reporting hierarchy and exposes data-quality problems that would otherwise be difficult to identify in a workbook.

### 10.2 Hierarchy View

For each role, the view shows:

- Role title
- Reporting-to role
- JD ID
- Career level
- Grade
- Function
- Organizational layer
- Active/Inactive status

Users can expand individual branches, expand all roles, or collapse the complete hierarchy.

### 10.3 Search and Filters

- Search by Role Title, Reporting To, or JD ID.
- Filter by Career Level.
- Filter by Grade.
- Filter by Function.
- Filter by Layer.
- Filter by Active/Inactive status.

When search results match a nested role, its ancestors are retained as context.

### 10.4 Data-Quality Handling

The hierarchy builder identifies:

- Root roles with no parent.
- Child roles linked by case-insensitive role-title matching.
- Missing parent references.
- Cyclic reporting relationships.
- Roles that cannot be linked into the primary hierarchy.

Missing-parent and cyclic branches are shown in a separate **Unlinked Roles** section instead of silently disappearing.

Relevant implementation:

- [Organization Structure view](apps/web/src/features/org-structure/OrgStructureView.tsx)
- [Organization Structure API](apps/api/src/modules/hrbp-point/org-structure-import/org-structure-import.controller.ts)

---

## 11. Management Review Meeting Module

**Route:** `/mrm`  
**Primary users:** All authorized roles for viewing; HRBP for management

### 11.1 Business Purpose

MRM provides a controlled monthly KPI document for management reviews. It combines calculated workforce metrics, manually maintained values, status indicators, supporting files, and finalized monthly history.

### 11.2 Monthly Report Lifecycle

1. Select a reporting month.
2. Load calculated metrics from the applicable workforce data month.
3. Enter or update manual KPI values.
4. Set Green, Amber, or Red status values.
5. Optionally customize non-managed rows and columns.
6. Upload supporting attachments.
7. Save automatically or explicitly.
8. Finalize the report.
9. View the finalized report as an immutable monthly record.

### 11.3 Performance Dashboard Tables

Each reporting month contains two independent tables:

- **PS Corp Performance Dashboard:** PUL and the Corp performance KPIs shown in the first reference.
- **PS-IN Performance Dashboard:** Performance KPIs followed by the workforce/PUL breakdown. The second and third references are two continuations of this single PS-IN table, not separate tables.

The tables share reporting columns but keep their rows, manual values, statuses, attachments, highlighting, and ordering independent. Calculated KPIs that appear in both tables reuse the same governed calculation while retaining separate table rows.

Both tables support:

- Calculated cells supplied by backend metric definitions.
- Manual value cells.
- Traffic-light status cells.
- Attachment cells.
- Managed KPI rows protected from structural deletion.
- User-created KPI rows within the selected table.
- User-created value, status, or attachment columns.
- Editable headings and descriptions.
- Row highlighting and muted presentation.
- Reordering of rows within their table and shared columns across both tables.

### 11.4 Persistence and Concurrency

- Drafts are stored in PostgreSQL.
- Changes autosave after a short delay.
- Users can trigger an immediate save.
- Reports carry a revision number.
- A conflicting concurrent update returns a save conflict instead of overwriting another user's work.
- Unsaved local state is preserved when a conflict occurs until the user reloads.

### 11.5 Finalization

- HRBP can finalize only when the required source data is available.
- The current revision is verified during finalization.
- Finalized reports become read-only.
- Finalized monthly metrics are retained as reporting snapshots.
- Database safeguards protect finalized report data from later modification.

### 11.6 Attachments

Supported report attachments include:

- PDF
- XLSX
- DOCX
- PNG
- JPG/JPEG

Authorized users can download attachments. HRBP can upload or delete attachments while the report remains an editable draft.

### 11.7 Presentation Outputs

- **Copy Tables:** Copies both tables as rich HTML and plain text suitable for pasting into Excel or PowerPoint.
- **Export Excel:** Downloads a formatted `.xls` representation containing both table sections.
- Status cells are represented with presentation-friendly status indicators.

Relevant implementation:

- [MRM report interface](apps/web/src/features/mrm/MrmReport.tsx)
- [MRM API](apps/api/src/modules/mrm/mrm.controller.ts)
- [MRM documentation](MRM.md)
- [MRM snapshot migration](apps/sql/mrm_monthly_metric_snapshots_migration.sql)

---

## 12. HRBP Point Module

**Route:** `/hrbp-point`  
**Primary users:** HRBP

### 12.1 Business Purpose

HRBP Point is the operational data-management center. It controls the source datasets used by dashboards and employee profiles through preview, validation, correction, and transactional commit workflows.

### 12.2 Standard Import Lifecycle

Most imports follow this process:

1. Select a supported CSV or XLSX file.
2. Upload it to create an account-owned preview.
3. Parse and normalize workbook headers and values.
4. Validate required fields, data types, dates, duplicates, and business rules.
5. Display total, valid, invalid, and warning counts.
6. Filter and paginate preview rows.
7. Edit incorrect rows and revalidate them.
8. Delete unwanted preview rows where supported.
9. Confirm replacement of the live dataset.
10. Commit all valid data in one database transaction.
11. Roll back completely if validation or persistence fails.

This pattern prevents partially imported files from corrupting live reporting data.

### 12.3 Namelist Import

The employee namelist is the primary workforce dataset.

Features include:

- CSV and XLSX upload.
- Reporting-month selection.
- Validation of the required 29-column PS Namelist structure.
- Column matching independent of column order.
- Approved header aliases and normalized matching.
- Duplicate personnel-number detection.
- All, Valid, and Invalid preview filters.
- Row editing and revalidation.
- Replacement confirmation before commit.
- Current live namelist replacement.
- Recent monthly employee-detail history.
- Historical organization-level snapshot generation.
- Separate historical import workflow.

Reference: [Namelist import panel](apps/web/src/features/hrbp-point/NamelistImportPanel.tsx)

### 12.4 Monthly Headcount Import

This workflow imports historical headcount aggregates from multi-sheet workbooks.

Features include:

- Detection of reporting months from worksheet names.
- Header discovery in the first workbook rows.
- Aggregation of total headcount.
- Aggregation by Range.
- Aggregation by Organizational Unit.
- Aggregation by Range and Organizational Unit combination.
- Preview before commit.
- Transactional replacement of imported months.

This is identified in project documentation as a temporary migration tool: the historical aggregate tables remain useful after the import UI is no longer needed.

Reference: [Monthly headcount import documentation](MONTHLY_HEADCOUNT_IMPORT.md)

### 12.5 Job Description Management

HRBP can maintain the JD master through:

- Create, edit, and delete operations.
- JD ID and role-title management.
- CSV bulk import.
- Search and pagination.
- Lookup by the final three digits of a JD ID.
- Employee JD assignment import with preview and validation.
- Employee JD movement reporting.

JD master data is reused by Employee 360, talent workflows, Succession Planning, and Org Structure.

Reference: [JD management panel](apps/web/src/features/hrbp-point/JdManagementPanel.tsx)

### 12.6 Employee Leave and Special Status

HRBP can create, edit, and delete employee status records for:

- Maternity
- Sabbatical
- CRL
- Absconding

Each record includes employee number, status type, start date, and end date. Date validation prevents the end date from preceding the start date. These records feed the workforce KPIs and employee status reporting.

### 12.7 PPP History Import

- Upload employee PPP history.
- Preview and filter records.
- Correct invalid staged values.
- Commit performance history transactionally.
- Display the resulting history in Employee 360.

### 12.8 Active STEP Import

- Upload the latest STEP workbook.
- Validate employee assignments and STEP periods.
- Preview, edit, or remove staged rows.
- Commit the confirmed dataset.
- Display Active STEP assignments in Talent Landscape and Employee 360.

### 12.9 Available Talent Management

- Bulk XLSX import with preview and correction.
- Manual row creation, editing, and deletion.
- Employee lookup by personnel number.
- JD validation and lookup.
- Available Talent register shown in Talent Landscape.

### 12.10 Nomination Status Import

- Upload nomination status data.
- Validate required employees and status values.
- Filter valid and invalid rows.
- Edit or remove staged rows.
- Commit the confirmed status dataset.
- Feed TAR or nomination-health reporting in Talent Landscape.

### 12.11 Talent and Development Pool Registers

Each pool supports:

- Separate live register.
- Manual HRBP row maintenance.
- XLSX bulk import.
- Employee lookup against the namelist.
- Required-field and date validation.
- Duplicate employee detection within the selected register.
- Non-blocking warnings for namelist mismatches.
- Stale-preview detection if the live register changes after preview creation.
- Atomic replacement of only the selected pool.

An employee may intentionally appear in both Talent and Development pools.

### 12.12 Succession Planning Import

- Import position, incumbent, successor, readiness, JD, rating, and IDP information.
- Validate staged rows and expose warnings.
- Edit or delete preview rows.
- Atomically replace the current Succession Planning register.
- Feed both the dashboard and Employee 360 portfolio.

### 12.13 Attrition Import

- Import employee separation records.
- Validate personnel, separation type, reason, and dates.
- Separate errors from warnings.
- Edit or delete staged rows.
- Atomically replace the Attrition source data.
- Feed attrition KPIs, trends, reasons, and detailed registers.

### 12.14 Organization Structure Import

- Upload an XLSX reporting hierarchy.
- Preview role relationships.
- Edit or delete staged roles.
- Commit the complete role dataset atomically.
- Replace the live Org Structure view.
- Preserve missing or cyclic parent references for visibility in the Unlinked Roles section.

### 12.15 RBIN Namelist Cleaning

This workflow transforms raw RBIN employee files into the PS Namelist structure.

#### Input and Transformation

- Accept CSV or XLSX files containing Active, Inbound, and Outbound employee records.
- Associate each cleaning batch with a reporting month.
- Keep PS employees according to source organizational-area rules.
- Derive Range and Function using maintained Organizational Unit mappings.
- Compare staged rows against the current PS Namelist baseline.

#### Classification

Rows are classified as:

- New
- Changed
- Unchanged
- Excluded
- Invalid

The preview also shows raw-row count, staged-row count, valid rows, and missing-mapping alerts.

#### Review and Correction

- Saved cleaning batches remain available for later review.
- Search by personnel identifiers.
- Filter by classification.
- Switch between key review fields and all 29 output fields.
- Inspect previous baseline values.
- See which fields changed.
- See whether Range/Function originated from a mapping or manual correction.
- Edit individual staged cells and revalidate immediately.

#### Finalization and Export

- Finalization is blocked while invalid rows remain.
- A finalized cleaned dataset becomes eligible for export.
- Export produces a 29-column XLSX PS Namelist.
- Export events retain metadata such as actor, row count, timestamp, and integrity hash.

Reference: [RBIN cleaning panel](apps/web/src/features/hrbp-point/RbinNamelistCleaningPanel.tsx)

### 12.16 RBIN Mapping Management

HRBP can maintain reusable mappings for:

- Organizational Unit to Range
- Organizational Unit to Function

Mappings support list, search, create, update, and delete operations. Missing mappings are surfaced during RBIN cleaning and block finalization until resolved or manually corrected.

### 12.17 RBIN Exception Rules

HRBP can maintain reusable column-level exception rules. These rules support special handling of known source-data cases during transformation and validation.

Relevant implementation:

- [HRBP Point dashboard](apps/web/src/features/hrbp-point/HrbpPointDashboard.tsx)
- [HRBP API modules](apps/api/src/modules/hrbp-point)

---

## 13. Access Point Module

**Route:** `/access-point`  
**Primary users:** HRBP

### 13.1 Business Purpose

Access Point connects employee identities to application accounts, business roles, and authorized workforce scopes.

### 13.2 Employee-Based Onboarding

HRBP can:

- Search the current namelist by employee name or personnel number.
- Review employee number, official email, designation, Range, and Organizational Unit.
- Select an existing employee as the account owner.
- Create a new account with a temporary password when no account exists.
- Add another access assignment without changing the password when an account already exists.

### 13.3 Role and Scope Assignment

Available assignments include:

- Admin with organization-wide scope.
- Range Head with a selected Range.
- Department Head with a selected Range and one or more Organizational Units.
- Sub-Department Head with a selected Range and Organizational Unit.

Creating a Department Head assignment for multiple Organizational Units creates separate scope assignments for the same account.

### 13.4 Access Maintenance

The Current Access table displays:

- Employee identity
- Assigned role
- Assigned Range
- Assigned Organizational Unit
- Account status
- Last-updated timestamp

HRBP can edit active assignments or deactivate an account.

### 13.5 Deactivation

Account deactivation:

- Immediately prevents further access.
- Revokes the account's active sessions.
- Preserves the account and assignment history for audit purposes.
- Prevents further editing of inactive assignments from the UI.

Relevant implementation:

- [Access Point dashboard](apps/web/src/features/access-point/AccessPointDashboard.tsx)
- [Access Point API](apps/api/src/modules/access-point/access-point.controller.ts)

---

## 14. Authentication and Security Features

### 14.1 Authentication

- Email and password login.
- Passwords stored using Argon2id hashes.
- Opaque database-backed browser sessions.
- Protected HttpOnly session cookies.
- Current-user session endpoint.
- Explicit logout.
- Generic login failures to reduce account enumeration.

### 14.2 Temporary Password Flow

- Newly provisioned users can receive a temporary password.
- The account is marked as requiring a password change.
- Application navigation redirects the user to Change Password.
- Protected business pages remain unavailable until the password has been changed.

### 14.3 Authorization

- API controllers declare required permissions.
- Authentication and permission checks run server-side.
- Roles and workforce scope are loaded from trusted account/access data rather than browser input.
- Missing authentication returns an unauthorized response.
- Insufficient permission returns a forbidden response.

### 14.4 Mutation Protection

- State-changing web requests include CSRF protection.
- Account deactivation and role changes can revoke sessions so access changes take effect promptly.
- Sensitive authenticated responses are designed to avoid shared-cache exposure.

### 14.5 Auditability

The platform stores security and operational history for important events such as:

- Account creation
- Login and logout
- Password change
- Access assignment changes
- Account deactivation
- Import and export operations where supported
- MRM finalization

Relevant implementation:

- [Authentication API](apps/api/src/modules/auth/auth.controller.ts)
- [Security architecture](SECURITY_ARCHITECTURE.md)

---

## 15. Shared User Experience Features

### 15.1 Reusable Data Tables

Operational tables support:

- Pagination and selectable page size.
- Grouped column headings where required.
- Grouped filter categories.
- Text search filters.
- Select filters.
- Date-range filters.
- Blank-value filtering.
- Active-filter counts.
- Reset table view.
- Optional context-description hiding.
- Full-screen table mode with keyboard focus handling.
- Responsive horizontal scrolling for wide registers.
- HRBP CSV download of the filtered dataset.

CSV export protects values that begin with spreadsheet formula characters, reducing formula-injection risk when files are opened in Excel.

Reference: [Reusable DataTable](apps/web/src/components/data-table/DataTable.tsx)

### 15.2 Consistent Workforce Filters

The major dashboards use a shared filter vocabulary:

- Function
- Organizational Unit
- Range
- Location
- Gender
- Direct/Indirect classification

Selections are multi-value, validated server-side, and generally preserved in the URL.

### 15.3 Accessibility and Navigation

Implemented accessibility features include:

- Skip-to-main-content navigation.
- Semantic headings and regions.
- Accessible button and dialog labels.
- Keyboard-operable filters and tables.
- Focus handling in expanded table dialogs.
- Status messages for loading, saving, validation, and errors.
- Responsive side navigation.

### 15.4 Error and Loading States

The application provides:

- Route-level loading states.
- Error pages with retry or reload actions.
- Empty-state messaging when data is unavailable.
- Inline validation messages.
- API-unavailable and save-failure feedback.
- Conflict feedback for concurrent MRM editing.

---

## 16. Data History and Reporting Strategy

The platform uses different history strategies according to business need:

- **Current namelist:** Detailed live employee data.
- **Recent namelist months:** Detailed employee-level history for recent reporting periods.
- **Demographics archives:** Organization-level KPI and chart snapshots for older months.
- **Talent and Succession snapshots:** Explicit monthly organization-wide snapshots.
- **MRM reports:** Draft and finalized monthly report documents with metric snapshots.
- **PPP, Career Journey, JD movement, and pool registers:** Domain-specific historical or current records presented through Employee 360.
- **RBIN batches and exports:** Persistent transformation and export history.

This balances employee-level operational reporting with longer-term aggregate reporting.

---

## 17. Important Implementation Boundaries

These points should be stated accurately during a presentation:

1. **Head roles are scoped viewers.** HRBP is currently the operational editor and importer.
2. **Custom Overview is personalized for HRBP and Admin.** It is separate from the fixed Demographics dashboard.
3. **Talent Pool and Development Pool are implemented views.** Legacy Talent Pipeline routes such as Overview, Org Mapping, and MRM currently redirect rather than providing separate implemented subtabs.
4. **Monthly snapshots are intentional frozen reporting records.** They should not be described as live recalculations of historical months.
5. **Org Structure preserves malformed relationships for review.** Missing and cyclic links are shown as Unlinked Roles rather than rejected during import.
6. **RBIN cleaning batches are persistent.** They differ from temporary preview-based imports.
7. **The historical headcount importer is a migration utility.** Project documentation identifies it as temporary after historical loading is complete.
8. **Application export is permission-controlled, but visible data can still be manually copied or captured.**
9. **The implemented architecture is a Next.js application with a NestJS API and PostgreSQL.** Future service decomposition described in architecture documents is not a current feature.
10. **Multi-factor authentication, idle-session timeout, and advanced production observability are not presented as implemented features.**

---

## 18. Recommended Presentation Story

### 18.1 Executive Narrative

PS Dashboard replaces disconnected spreadsheets with a governed workforce platform. It creates one controlled data pipeline from HR imports to executive dashboards, employee profiles, talent decisions, succession readiness, attrition analysis, organization hierarchy, and monthly management reporting.

### 18.2 Key Business Value

- One trusted workforce data source.
- Faster management reporting.
- Fewer manual spreadsheet calculations.
- Early validation before data affects dashboards.
- Employee-level drill-down from organization-wide KPIs.
- Controlled access based on management responsibility.
- Historical monthly reporting and auditability.
- Integrated talent, development, succession, and attrition views.

---

## 19. Recommended Demo Flow

### Step 1: Authentication and Role Awareness

1. Sign in with a scoped management account.
2. Show that navigation contains only authorized modules.
3. Explain temporary-password enforcement and server-side permissions.

### Step 2: Custom Executive Overview

1. Open Overview.
2. Apply Range or Organizational Unit filters.
3. Open a KPI drill-down.
4. Enter Customize mode.
5. Add, remove, and reorder widgets.
6. Save the personalized layout.

### Step 3: Demographics

1. Show headline workforce KPIs.
2. Demonstrate Function, Gender, and Location visualizations.
3. Select a historical reporting month.
4. Explain the distinction between recent detail and archived snapshots.

### Step 4: Employee 360

1. Search for an employee.
2. Open the employee profile.
3. Show organization and career information.
4. Walk through Career Journey, PPP, STEP, Talent, Development, Succession, and IDP panels.
5. With an HRBP account, demonstrate a controlled JD or IDP update.

### Step 5: Talent Landscape

1. Show Talent Pool KPIs and Active/Passive distribution.
2. Show nomination-health status and expiration exposure.
3. Open Available Talent, Active STEP, and Talent Pool registers.
4. Switch to Development Pool.
5. Select a historical monthly snapshot.

### Step 6: Succession Planning

1. Show Successor 1 and Successor 2 readiness.
2. Click Ready Now to open employee assignments.
3. Show position criticality and expected change charts.
4. Open the detailed position register.

### Step 7: Attrition

1. Filter by year and separation type.
2. Explain total attrition and average-headcount rate.
3. Show the monthly trend and top reasons.
4. Open the detailed separation register.

### Step 8: Organization Structure

1. Search for a role.
2. Expand a reporting branch.
3. Filter by Career Level or Function.
4. Show the Unlinked Roles section as a data-quality control.

### Step 9: MRM

1. Select the current reporting month.
2. Update a manual value and status.
3. Show autosave and revision state.
4. Add a supporting attachment.
5. Copy the formatted tables or export both sections to Excel.
6. Explain finalization and immutability without finalizing a production report during the demo.

### Step 10: HRBP Import Governance

1. Open an existing import preview or upload a safe demonstration file.
2. Show valid and invalid row counts.
3. Correct one invalid row and demonstrate revalidation.
4. Explain transactional commit and rollback.
5. Show RBIN baseline comparison, mappings, and XLSX export.

### Step 11: Access Point

1. Search for an employee.
2. Assign a management role and scope.
3. Show multiple Organizational Unit assignments.
4. Explain temporary-password change and session revocation on deactivation.

---

## 20. Concise Presentation Summary

PS Dashboard delivers an integrated workforce-management platform with:

- Personalized executive workforce dashboards
- Demographic and historical workforce analytics
- Employee 360 profiles
- Talent and Development Pool management
- Succession readiness and position planning
- Attrition analytics
- Interactive organization hierarchy
- Monthly Management Review Meeting reporting
- Governed HRBP import and validation workflows
- RBIN-to-PS Namelist transformation
- Role- and scope-based access administration
- Secure authentication, server-side authorization, and auditability

The central differentiator is the connection between **governed source-data imports**, **employee-level operational records**, and **management-level analytics** within one permission-controlled platform.
