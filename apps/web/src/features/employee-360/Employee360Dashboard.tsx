"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  appendFilterValues,
  emptyDashboardFilters,
  mapWorkforceFilterOptions,
  reconcileDashboardFilters,
  sameFilterSelection,
  toFilterSelection,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import { areAllOptionsSelected, MultiSelectFilter } from "@/components/filters/MultiSelectFilter";
import "@/components/filters/overview-filters.css";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import { formatEmployeeDate } from "./employee-date";
import type {
  Employee360Query,
  Employee360Response,
  Employee360Row,
} from "./employee-360.types";
import "./employee-360.css";

type Employee360TableRow = Employee360Row & { viewProfile: string };

const filterFields = [
  "functionName", "range", "orgUnit", "location", "gender", "employmentType",
] as const satisfies readonly DashboardFilterKey[];

const filterLabels: Record<(typeof filterFields)[number], string> = {
  functionName: "Function",
  orgUnit: "Org unit",
  range: "Range",
  location: "Location",
  gender: "Gender",
  employmentType: "Direct / indirect",
};

const employeeColumns: DataTableColumn<Employee360TableRow>[] = [
  { key: "persNo", label: "Pers.No.", group: "Identity", filterable: true, filterType: "search" },
  { key: "personnelNumber", label: "Personnel Number", group: "Identity", filterable: true, filterType: "search" },
  { key: "employeeGroup", label: "Employee Group", group: "Employment", filterable: true },
  { key: "psGroup", label: "PS group", group: "Employment", filterable: true },
  { key: "orgUnit", label: "Organizational Unit", group: "Organization", filterable: true },
  { key: "range", label: "Range", group: "Organization", filterable: true },
  { key: "functionName", label: "Function", group: "Organization", filterable: true },
  { key: "gender", label: "Gender Key", group: "Profile", filterable: true },
  { key: "location", label: "Location", group: "Profile", filterable: true },
  { key: "ntId", label: "NT_ID", group: "Identity", filterable: true },
  { key: "globalId", label: "Global ID", group: "Identity", filterable: true },
  { key: "costCenter", label: "Cost Ctr", group: "Organization", filterable: true },
  { key: "birthDate", label: "Birth date", group: "Dates", filterable: true, filterType: "date-range", format: (value) => formatEmployeeDate(value, "") },
  { key: "joiningDate", label: "Date of Joining", group: "Dates", filterable: true, filterType: "date-range", format: (value) => formatEmployeeDate(value, "") },
  { key: "entryForRetirement", label: "Entry for Retirement", group: "Dates", filterable: true, filterType: "date-range", format: (value) => formatEmployeeDate(value, "") },
  { key: "designationText", label: "Designation Text", group: "Employment", filterable: true },
  { key: "hrbpGlobalId", label: "Global-Id of HRBP", group: "HRBP", filterable: true },
  { key: "hrbp2GlobalId", label: "Global-Id Of HRBP2", group: "HRBP", filterable: true },
  { key: "officialEmail", label: "Email Official", group: "Contact", filterable: true },
  { key: "technicalEntryDate", label: "Technical Entry Date", group: "Dates", filterable: true, filterType: "date-range", format: (value) => formatEmployeeDate(value, "") },
  { key: "directOrIndirect", label: "Direct or Indirect", group: "Employment", filterable: true, format: formatDirectOrIndirect },
];

function toDashboardFilters(query: Employee360Query, options: Employee360Response["filterOptions"]): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    functionName: toFilterSelection(query.functionName, options.functionName),
    orgUnit: toFilterSelection(query.orgUnit, options.orgUnit),
    range: toFilterSelection(query.range, options.range),
    location: toFilterSelection(query.location, options.location),
    gender: toFilterSelection(query.gender, options.gender),
    employmentType: toFilterSelection(query.directOrIndirect, options.directOrIndirect),
  };
}

function toSearchParams(filters: DashboardFilters, search: string, options: Employee360Response["filterOptions"]) {
  const params = new URLSearchParams();
  const mappings = [
    ["functionName", filters.functionName, options.functionName],
    ["orgUnit", filters.orgUnit, options.orgUnit],
    ["range", filters.range, options.range],
    ["location", filters.location, options.location],
    ["gender", filters.gender, options.gender],
    ["directOrIndirect", filters.employmentType, options.directOrIndirect],
  ] as const;
  mappings.forEach(([key, value, allOptions]) => appendFilterValues(params, key, value, allOptions));
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function Employee360Dashboard({
  data,
  activeQuery,
}: {
  data: Employee360Response;
  activeQuery: Employee360Query;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedFilters = toDashboardFilters(activeQuery, data.filterOptions);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [search, setSearch] = useState(activeQuery.search ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<DashboardFilterKey | null>(null);
  const controlsRef = useRef<HTMLElement>(null);
  const optionRequestId = useRef(0);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const dashboardFilterOptions = mapWorkforceFilterOptions(filterOptions);
  const activeFilters = filterFields.filter((key) => !areAllOptionsSelected(appliedFilters[key], dashboardFilterOptions[key] ?? []));
  const hasEmptySelection = filterFields.some((key) => draftFilters[key].length === 0);
  const hasPendingChanges = filterFields.some(
    (key) => !sameFilterSelection(draftFilters[key], appliedFilters[key]),
  ) || search.trim() !== (activeQuery.search ?? "");
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const rows: Employee360TableRow[] = data.employees.map((employee) => ({
    ...employee,
    viewProfile: "",
  }));
  const columns: DataTableColumn<Employee360TableRow>[] = [
    {
      key: "viewProfile",
      label: "",
      group: "Action",
      exportable: false,
      render: (_value, employee) => (
        <Link
          className="a-button a-button--integrated employee-360__view-profile"
          href={`/employee-360/${encodeURIComponent(employee.persNo)}?returnTo=${encodeURIComponent(returnTo)}`}
          aria-label={`View ${employee.personnelNumber ?? employee.persNo} profile`}
          title="View employee profile"
        >
          <i className="a-icon a-button__icon boschicon-bosch-ic-watch-on" aria-hidden="true" />
        </Link>
      ),
    },
    ...employeeColumns,
  ];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const navigate = (filters: DashboardFilters, searchValue: string) => {
    if (filterFields.some((key) => filters[key].length === 0)) return;
    const params = toSearchParams(filters, searchValue, filterOptions);
    setIsLoading(true);
    startTransition(() => {
      router.push(params.size ? `/employee-360?${params.toString()}` : "/employee-360");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters, changedKey: DashboardFilterKey) => {
    const requestId = ++optionRequestId.current;
    const previousOptions = dashboardFilterOptions;
    setIsLoadingOptions(true);
    try {
      const params = toSearchParams(filters, search, filterOptions);
      const response = await fetch(`/api/employee-360/filter-options${params.size ? `?${params}` : ""}`);
      if (!response.ok) return;
      const options = await response.json() as Employee360Response["filterOptions"];
      if (requestId === optionRequestId.current) {
        const nextOptions = mapWorkforceFilterOptions(options);
        setFilterOptions(options);
        setDraftFilters(reconcileDashboardFilters(filters, previousOptions, nextOptions, changedKey));
      }
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(draftFilters, search);
  };

  return (
    <main className="employee-360">
      <section className="employee-360__heading">
        <h1>Employee 360</h1>
        <p>Employees available within your authorized workforce scope.</p>
      </section>
      <section className="employee-360__controls" aria-label="Employee search and filters" ref={controlsRef}>
        <form onSubmit={submitSearch}>
          <div className="employee-360__toolbar">
            <div className="employee-360__search-field">
              <label htmlFor="employee-360-search">Personnel number or employee name</label>
              <div>
                <i className="a-icon boschicon-bosch-ic-search" aria-hidden="true" />
                <input id="employee-360-search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Search by personnel number or name" />
                {search && <button className="a-button a-button--integrated" type="button" aria-label="Clear search" title="Clear search" onClick={() => setSearch("")}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>}
              </div>
            </div>
            <button className="a-button a-button--primary employee-360__search-button" type="submit">
              <i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" />
              <span className="a-button__label">Search</span>
            </button>
            <button className="a-button a-button--secondary employee-360__filter-toggle" type="button" aria-label={`Filters${activeFilters.length ? `, ${activeFilters.length} applied` : ""}`} aria-expanded={areFiltersOpen} aria-controls="employee-360-filter-panel" onClick={() => { setAreFiltersOpen((open) => !open); setOpenFilter(null); }}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" />
              <span className="a-button__label">Filters</span>
            </button>
          </div>

          {(activeQuery.search || activeFilters.length > 0) && <div className="employee-360__active-filters">
            <span>Current view:</span>
            {activeQuery.search && <strong>Search: {activeQuery.search}</strong>}
            {activeFilters.map((key) => <strong key={key}>{filterLabels[key]}: {appliedFilters[key].length === 1 ? appliedFilters[key][0] : `${appliedFilters[key].length} selected`}</strong>)}
            <button className="a-button a-button--integrated -small" type="button" onClick={() => { const resetFilters = toDashboardFilters({}, data.filterOptions); setSearch(""); setDraftFilters(resetFilters); navigate(resetFilters, ""); }}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
              <span className="a-button__label">Clear all</span>
            </button>
          </div>}

          {areFiltersOpen && <div className="employee-360__filter-panel" id="employee-360-filter-panel">
            <div className="employee-360__filter-grid">
              {filterFields.map((key) => <MultiSelectFilter
                key={key}
                id={`employee-360-filter-${key}`}
                label={filterLabels[key]}
                options={dashboardFilterOptions[key] ?? []}
                value={draftFilters[key]}
                isOpen={openFilter === key}
                onToggle={() => setOpenFilter((current) => current === key ? null : key)}
                onClose={() => setOpenFilter(null)}
                onChange={(selection) => {
                  const next = { ...draftFilters, [key]: selection };
                  setDraftFilters(next);
                  void refreshFilterOptions(next, key);
                }}
                formatOption={key === "employmentType" ? formatDirectOrIndirect : undefined}
              />)}
            </div>
            <div className="employee-360__filter-footer">
              <p aria-live="polite">{isLoadingOptions ? "Updating filter choices..." : hasPendingChanges ? "Changes are ready to apply." : activeFilters.length > 0 ? `${activeFilters.length} filters applied.` : "No filters applied."}</p>
              <div>
                <button className="a-button a-button--secondary -small" type="button" onClick={() => { const resetFilters = toDashboardFilters({}, data.filterOptions); setDraftFilters(resetFilters); navigate(resetFilters, search); }}><span className="a-button__label">Reset filters</span></button>
                <button className="a-button a-button--primary -small" type="submit" disabled={hasEmptySelection}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" />
                  <span className="a-button__label">Apply</span>
                </button>
              </div>
            </div>
          </div>}
        </form>
      </section>
      {isLoading && <p className="employee-360__loading" role="status">Updating employees...</p>}
      <DataTable
        title="Employee details"
        description={`${data.employees.length} employees found. Your own employee record is excluded.`}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.persNo}
        downloadFileName="employee-360"
        pageSizeOptions={[10, 25, 50]}
        groupFilters
      />
    </main>
  );
}