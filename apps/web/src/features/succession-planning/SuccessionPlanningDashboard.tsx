"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import { getCsrfToken } from "@/auth/csrf";
import {
  ChartCard,
  DonutChart,
  VerticalBarChart,
} from "@/components/charts/OverviewCharts";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import {
  appendFilterValues,
  emptyDashboardFilters,
  mapWorkforceFilterOptions,
  OverviewFilters,
  reconcileDashboardFilters,
  toFilterSelection,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import {
  percentage,
  readinessCategory,
  summarizeSuccessionPlanning,
  type Readiness,
  type SuccessorNumber,
} from "./succession-planning.analytics";
import {
  successionPlanningColumns,
  type SuccessionPlanningFilterOptions,
  type SuccessionPlanningHistoryState,
  type SuccessionPlanningQueryFilters,
  type SuccessionPlanningRecord,
  type SuccessionPlanningResponse,
} from "./succession-planning.types";
import "./succession-planning.css";

const successionFilterFields: readonly DashboardFilterKey[] = [
  "functionName", "range", "orgUnit", "location", "gender", "employmentType",
];

const currentDate = new Date();
const latestSnapshotMonth = new Date(
  Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1),
).toISOString().slice(0, 7);

function toDashboardFilters(filters: SuccessionPlanningQueryFilters, options: SuccessionPlanningFilterOptions): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    functionName: toFilterSelection(filters.functionName, options.functionName),
    orgUnit: toFilterSelection(filters.orgUnit, options.orgUnit),
    range: toFilterSelection(filters.range, options.range),
    location: toFilterSelection(filters.location, options.location),
    gender: toFilterSelection(filters.gender, options.gender),
    employmentType: toFilterSelection(filters.directOrIndirect, options.directOrIndirect),
  };
}

function toSearchParams(filters: DashboardFilters, options: SuccessionPlanningFilterOptions) {
  const params = new URLSearchParams();
  const values = [
    ["functionName", filters.functionName, options.functionName],
    ["orgUnit", filters.orgUnit, options.orgUnit],
    ["range", filters.range, options.range],
    ["location", filters.location, options.location],
    ["gender", filters.gender, options.gender],
    ["directOrIndirect", filters.employmentType, options.directOrIndirect],
  ] as const;
  values.forEach(([key, value, allOptions]) => appendFilterValues(params, key, value, allOptions));
  return params;
}

const nonFilterableColumns = new Set([
  "jd_name",
  "reason_for_change",
]);
const searchableColumns = new Set([
  "incumbent_pers_no",
  "incumbent_name",
  "successor1_pers_no",
  "successor1_name",
  "successor2_pers_no",
  "successor2_name",
]);

const columns: DataTableColumn<SuccessionPlanningRecord>[] = successionPlanningColumns.map(
  ([key, label, group]) => ({
    key,
    label,
    group,
    filterable: !nonFilterableColumns.has(key),
    filterType: searchableColumns.has(key) ? "search" : "select",
  }),
);

type ReadinessKpi = { category: Readiness; metric: KpiMetric };
type ReadinessSelection = { category: Readiness; successor: SuccessorNumber };

type ReadinessAssignment = {
  key: string;
  personnelNumber: string;
  name: string;
  department: string;
  currentJdId: string;
  targetJdId: string;
  targetJdName: string;
  rating: string;
  idpStatus: string;
};

function readinessAssignments(
  rows: SuccessionPlanningRecord[],
  selection: ReadinessSelection | null,
): ReadinessAssignment[] {
  if (!selection) return [];
  return rows.flatMap((row) => {
    const first = selection.successor === 1;
    const personnelNumber = first ? row.successor1_pers_no : row.successor2_pers_no;
    const readiness = first ? row.successor1_readiness : row.successor2_readiness;
    if (!personnelNumber.trim() || readinessCategory(readiness) !== selection.category) return [];
    return [{
      key: `${row.id}-${selection.successor}`,
      personnelNumber,
      name: first ? row.successor1_name : row.successor2_name,
      department: first ? row.successor1_dept_code : row.successor2_dept_code,
      currentJdId: first ? row.successor1_current_jd_id : row.successor2_current_jd_id,
      targetJdId: row.position_jd_id,
      targetJdName: row.jd_name,
      rating: first ? row.successor1_9_box_rating : row.successor2_9_box_rating,
      idpStatus: first ? row.successor1_idp_status : row.successor2_idp_status,
    }];
  });
}

function ReadinessKpiCard({
  item,
  successor,
  onOpen,
}: {
  item: ReadinessKpi;
  successor: SuccessorNumber;
  onOpen: (successor: SuccessorNumber, category: Readiness) => void;
}) {
  const open = () => onOpen(successor, item.category);
  return (
    <div
      className="succession-readiness-card"
      role="button"
      tabIndex={0}
      aria-label={`Show Successor ${successor} people who are ${item.metric.title}`}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
    >
      <KpiCard metric={item.metric} />
    </div>
  );
}

function importDescription(data: SuccessionPlanningResponse) {
  if (!data.importedAt) return "Current positions, incumbents, and successors";
  const imported = new Date(data.importedAt);
  const date = Number.isNaN(imported.getTime())
    ? data.importedAt
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(imported);
  return `${data.rows.length} positions · Imported ${date}${data.fileName ? ` from ${data.fileName}` : ""}`;
}

export function SuccessionPlanningDashboard({
  data,
  activeFilters,
  historyState,
  isSnapshot,
}: {
  data: SuccessionPlanningResponse;
  activeFilters: SuccessionPlanningQueryFilters;
  historyState: SuccessionPlanningHistoryState | null;
  isSnapshot: boolean;
}) {
  const router = useRouter();
  const appliedFilters = toDashboardFilters(activeFilters, data.filterOptions);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotMonth, setSnapshotMonth] = useState(latestSnapshotMonth);
  const [isSnapshotPublisherOpen, setIsSnapshotPublisherOpen] = useState(false);
  const readinessDialogRef = useRef<HTMLDialogElement>(null);
  const [readinessSelection, setReadinessSelection] = useState<ReadinessSelection | null>(null);
  const [readinessSearch, setReadinessSearch] = useState("");
  const [isReadinessFilterOpen, setIsReadinessFilterOpen] = useState(false);

  const applyFilters = (filters: DashboardFilters) => {
    const params = toSearchParams(filters, filterOptions);
    setIsFiltering(true);
    startTransition(() => {
      router.push(params.size ? `/succession-planning?${params}` : "/succession-planning");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters, changedKey: DashboardFilterKey) => {
    if (isSnapshot) return;
    const requestId = ++optionRequestId.current;
    const previousOptions = mapWorkforceFilterOptions(filterOptions);
    setIsLoadingOptions(true);
    try {
      const params = toSearchParams(filters, filterOptions);
      const response = await fetch(`/api/succession-planning/filter-options${params.size ? `?${params}` : ""}`);
      if (!response.ok) return;
      const options = (await response.json()) as SuccessionPlanningFilterOptions;
      if (requestId === optionRequestId.current) {
        setFilterOptions(options);
        setDraftFilters(reconcileDashboardFilters(
          filters,
          previousOptions,
          mapWorkforceFilterOptions(options),
          changedKey,
        ));
      }
    } catch {
      // Keep the current choices; Apply still validates filters on the server.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  const saveSnapshot = async () => {
    setIsSavingSnapshot(true);
    setSnapshotMessage("");
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/succession-planning/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ reportingMonth: snapshotMonth }),
      });
      const body = await response.json().catch(() => null) as { message?: string; reportingMonth?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "The monthly snapshot could not be saved.");
      setSnapshotMessage(`Saved Succession Planning snapshot for ${body?.reportingMonth ?? snapshotMonth}.`);
      router.refresh();
    } catch (error) {
      setSnapshotMessage(error instanceof Error ? error.message : "The monthly snapshot could not be saved.");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const summary = summarizeSuccessionPlanning(data.rows);
  const readinessKpis = (
    successor: "successor-1" | "successor-2",
    readiness: Map<Readiness, number>,
  ): ReadinessKpi[] => [
    { category: "Ready now", metric: { id: `${successor}-ready-now`, title: "Ready now", value: (readiness.get("Ready now") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready now") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-checkmark", iconColor: "green" } },
    { category: "Ready in 1-2 years", metric: { id: `${successor}-ready-one-two`, title: "Ready in 1-2 years", value: (readiness.get("Ready in 1-2 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready in 1-2 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "orange" } },
    { category: "Ready in 3-4 years", metric: { id: `${successor}-ready-three-four`, title: "Ready in 3-4 years", value: (readiness.get("Ready in 3-4 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready in 3-4 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "purple" } },
    { category: "Ready later / TBD", metric: { id: `${successor}-ready-later`, title: "Ready later", value: (readiness.get("Ready later / TBD") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready later / TBD") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-calendar", iconColor: "blue" } },
  ];
  const successor1Kpis = readinessKpis("successor-1", summary.successor1Readiness);
  const successor2Kpis = readinessKpis("successor-2", summary.successor2Readiness);
  const selectedAssignments = readinessAssignments(data.rows, readinessSelection);
  const normalizedReadinessSearch = readinessSearch.trim().toLowerCase();
  const visibleAssignments = normalizedReadinessSearch
    ? selectedAssignments.filter((assignment) => [
        assignment.personnelNumber,
        assignment.name,
        assignment.department,
        assignment.currentJdId,
        assignment.targetJdId,
        assignment.targetJdName,
        assignment.rating,
        assignment.idpStatus,
      ].some((value) => value.toLowerCase().includes(normalizedReadinessSearch)))
    : selectedAssignments;
  const openReadinessDetails = (successor: SuccessorNumber, category: Readiness) => {
    setReadinessSearch("");
    setIsReadinessFilterOpen(false);
    setReadinessSelection({ successor, category });
    window.requestAnimationFrame(() => readinessDialogRef.current?.showModal());
  };
  const periodOptions = historyState ? [
    { value: "", label: "Current" },
    ...historyState.snapshotMonths.map((month) => {
      const [year, monthNumber] = month.split("-");
      return { value: month, label: `${monthNumber}/${year}` };
    }),
  ] : undefined;

  return (
    <main className="overview-page">
      <OverviewFilters
        value={draftFilters}
        activeValue={appliedFilters}
        period={historyState ? activeFilters.reportingMonth ?? "" : undefined}
        periodOptions={periodOptions}
        fields={successionFilterFields}
        filtersDisabled={isSnapshot}
        options={mapWorkforceFilterOptions(filterOptions)}
        onChange={(filters, changedKey) => { setDraftFilters(filters); void refreshFilterOptions(filters, changedKey); }}
        onPeriodChange={historyState ? (reportingMonth) => {
          const params = new URLSearchParams();
          if (reportingMonth) params.set("reportingMonth", reportingMonth);
          startTransition(() => router.push(params.size ? `/succession-planning?${params}` : "/succession-planning"));
        } : undefined}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => {
          const resetFilters = toDashboardFilters({}, data.filterOptions);
          setDraftFilters(resetFilters);
          applyFilters(resetFilters);
        }}
        headerActions={historyState && !isSnapshot ? (
          <div className="succession-history-menu">
            <button className="a-button a-button--secondary -small succession-history-menu__trigger" type="button" aria-label="Save monthly snapshot" aria-expanded={isSnapshotPublisherOpen} aria-controls="succession-snapshot-publisher" title="Save monthly snapshot" onClick={() => setIsSnapshotPublisherOpen((isOpen) => !isOpen)}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
              <span className="a-button__label">Save monthly snapshot</span>
            </button>
            {isSnapshotPublisherOpen && (
              <div className="succession-history-popover" id="succession-snapshot-publisher" role="dialog" aria-label="Monthly snapshot">
                <strong>Save monthly snapshot</strong>
                <p>Archive the organization-wide Succession Planning results for a reporting month.</p>
                <label className="succession-history-month" htmlFor="succession-snapshot-month">
                  <span>Reporting month</span>
                  <input id="succession-snapshot-month" type="month" max={latestSnapshotMonth} value={snapshotMonth} disabled={isSavingSnapshot} onChange={(event) => setSnapshotMonth(event.target.value)} />
                </label>
                <button className="a-button a-button--secondary -small" type="button" disabled={!snapshotMonth || isSavingSnapshot} onClick={() => void saveSnapshot()}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
                  <span className="a-button__label">{isSavingSnapshot ? "Saving..." : "Save snapshot"}</span>
                </button>
                {snapshotMessage && <p className="succession-history-popover__message" role="status">{snapshotMessage}</p>}
              </div>
            )}
          </div>
        ) : undefined}
      />

      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating dashboard...</p>}

      <section className="kpi-section succession-readiness" aria-labelledby="succession-summary-title">
        <div className="kpi-section__header">
          <div>
            <h2 className="kpi-section__title" id="succession-summary-title">Successor readiness</h2>
            <p className="kpi-section__description">Primary and secondary successor coverage across current positions</p>
          </div>
          <div className="succession-readiness__total" aria-label={`${summary.totalPositions} total positions`}>
            <i className="a-icon boschicon-bosch-ic-briefcase" aria-hidden="true" />
            <span>Total positions</span>
            <strong>{summary.totalPositions.toLocaleString("en-US")}</strong>
          </div>
        </div>
        <div className="succession-readiness__groups">
          <section className="succession-successor-group" aria-labelledby="successor-1-readiness-title">
            <div className="succession-successor-group__heading">
              <h3 id="successor-1-readiness-title">Successor 1</h3>
              <p>Primary successor readiness outlook</p>
            </div>
            <KpiGrid>{successor1Kpis.map((item) => <ReadinessKpiCard key={item.metric.id} item={item} successor={1} onOpen={openReadinessDetails} />)}</KpiGrid>
          </section>
          <section className="succession-successor-group" aria-labelledby="successor-2-readiness-title">
            <div className="succession-successor-group__heading">
              <h3 id="successor-2-readiness-title">Successor 2</h3>
              <p>Secondary successor readiness outlook</p>
            </div>
            <KpiGrid>{successor2Kpis.map((item) => <ReadinessKpiCard key={item.metric.id} item={item} successor={2} onOpen={openReadinessDetails} />)}</KpiGrid>
          </section>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="succession-distribution-title">
        <div className="dashboard-section__heading">
          <h2 id="succession-distribution-title">Succession distribution</h2>
          <p>Position criticality and expected incumbent changes</p>
        </div>
        <div className="chart-grid succession-planning-charts">
          <ChartCard title="Positions by Criticality" description="Current positions grouped by criticality">
            {summary.criticalityChart.length ? <DonutChart data={summary.criticalityChart} total={summary.totalPositions.toLocaleString("en-US")} /> : <p>No criticality data available.</p>}
          </ChartCard>
          <ChartCard title="Incumbent change expected" description="Positions by expected change year">
            {summary.yearChart.some((item) => item.value > 0) ? <VerticalBarChart data={summary.yearChart} /> : <p>No expected change-year data available.</p>}
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Succession Planning positions">
        <DataTable
          title="Succession Planning positions"
          description={importDescription(data)}
          columns={columns}
          rows={data.rows}
          getRowKey={(row) => row.id}
          downloadFileName="succession-planning-position-register"
          pageSizeOptions={[10, 25, 50]}
          defaultPageSize={50}
          groupFilters
          groupedHeaders
          neutralAppearance
        />
      </section>

      <dialog className="succession-readiness-dialog" ref={readinessDialogRef} onClose={() => { setReadinessSelection(null); setReadinessSearch(""); setIsReadinessFilterOpen(false); }}>
        <div className="succession-readiness-dialog__content">
          <header>
            <div>
              <span>Successor {readinessSelection?.successor}</span>
              <h2>{readinessSelection?.category ?? "Readiness details"}</h2>
              <p>{visibleAssignments.length.toLocaleString("en-US")} of {selectedAssignments.length.toLocaleString("en-US")} assignment{selectedAssignments.length === 1 ? "" : "s"}</p>
            </div>
            <div className="succession-readiness-dialog__actions">
              <button
                className="a-button a-button--integrated"
                type="button"
                aria-label={`${isReadinessFilterOpen ? "Hide" : "Show"} assignment filter${readinessSearch ? " (active)" : ""}`}
                aria-controls="succession-readiness-filter"
                aria-expanded={isReadinessFilterOpen}
                title="Filter assignments"
                onClick={() => setIsReadinessFilterOpen((open) => !open)}
              >
                <i className={`a-icon a-button__icon boschicon-bosch-ic-filter${readinessSearch ? "-success" : ""}`} aria-hidden="true" />
              </button>
              <button className="a-button a-button--integrated" type="button" aria-label="Close readiness details" onClick={() => readinessDialogRef.current?.close()}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" />
              </button>
            </div>
          </header>
          {isReadinessFilterOpen && (
            <div className="succession-readiness-dialog__filter" id="succession-readiness-filter">
              <label htmlFor="succession-readiness-search">Filter assignments</label>
              <input
                id="succession-readiness-search"
                type="search"
                value={readinessSearch}
                placeholder="Search employee, department or JD"
                onChange={(event) => setReadinessSearch(event.target.value)}
              />
            </div>
          )}
          {visibleAssignments.length ? (
            <div className="succession-readiness-dialog__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Employee No.</th>
                    <th scope="col">Name</th>
                    <th scope="col">Department</th>
                    <th scope="col">Current JDID</th>
                    <th scope="col">Target JDID</th>
                    <th scope="col">Target JD Name</th>
                    <th scope="col">9 Box Rating</th>
                    <th scope="col">IDP Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssignments.map((assignment) => (
                    <tr key={assignment.key}>
                      <td>{assignment.personnelNumber}</td>
                      <td>{assignment.name}</td>
                      <td>{assignment.department}</td>
                      <td>{assignment.currentJdId}</td>
                      <td>{assignment.targetJdId}</td>
                      <td>{assignment.targetJdName}</td>
                      <td>{assignment.rating}</td>
                      <td>{assignment.idpStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="succession-readiness-dialog__empty">No matching successor assignments.</p>}
        </div>
      </dialog>
    </main>
  );
}
