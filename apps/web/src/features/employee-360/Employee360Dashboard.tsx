"use client";

import { startTransition, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  emptyDashboardFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import type {
  Employee360Query,
  Employee360Response,
  Employee360Row,
} from "./employee-360.types";
import "./employee-360.css";

type Employee360TableRow = Employee360Row & { viewProfile: string };

const filterFields = [
  "functionName", "orgUnit", "range", "location", "gender", "employmentType",
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
  { key: "persNo", label: "Pers.No.", group: "Identity" },
  { key: "personnelNumber", label: "Personnel Number", group: "Identity" },
  { key: "employeeGroup", label: "Employee Group", group: "Employment" },
  { key: "psGroup", label: "PS group", group: "Employment" },
  { key: "orgUnit", label: "Organizational Unit", group: "Organization" },
  { key: "range", label: "Range", group: "Organization" },
  { key: "functionName", label: "Function", group: "Organization" },
  { key: "gender", label: "Gender Key", group: "Profile" },
  { key: "location", label: "Location", group: "Profile" },
  { key: "ntId", label: "NT_ID", group: "Identity" },
  { key: "globalId", label: "Global ID", group: "Identity" },
  { key: "costCenter", label: "Cost Ctr", group: "Organization" },
  { key: "birthDate", label: "Birth date", group: "Dates" },
  { key: "joiningDate", label: "Date of Joining", group: "Dates" },
  { key: "entryForRetirement", label: "Entry for Retirement", group: "Dates" },
  { key: "designationText", label: "Designation Text", group: "Employment" },
  { key: "hrbpGlobalId", label: "Global-Id of HRBP", group: "HRBP" },
  { key: "hrbp2GlobalId", label: "Global-Id Of HRBP2", group: "HRBP" },
  { key: "officialEmail", label: "Email Official", group: "Contact" },
  { key: "technicalEntryDate", label: "Technical Entry Date", group: "Dates" },
  { key: "directOrIndirect", label: "Direct or Indirect", group: "Employment", format: formatDirectOrIndirect },
];

function toDashboardFilters(query: Employee360Query): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    functionName: query.functionName ?? "All",
    orgUnit: query.orgUnit ?? "All",
    range: query.range ?? "All",
    location: query.location ?? "All",
    gender: query.gender ?? "All",
    employmentType: query.directOrIndirect ?? "All",
  };
}

function toSearchParams(filters: DashboardFilters, search: string) {
  const params = new URLSearchParams();
  const mappings = [
    ["functionName", filters.functionName],
    ["orgUnit", filters.orgUnit],
    ["range", filters.range],
    ["location", filters.location],
    ["gender", filters.gender],
    ["directOrIndirect", filters.employmentType],
  ] as const;
  mappings.forEach(([key, value]) => {
    if (value !== "All") params.set(key, value);
  });
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
  const appliedFilters = toDashboardFilters(activeQuery);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [search, setSearch] = useState(activeQuery.search ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const activeFilters = filterFields.filter((key) => appliedFilters[key] !== "All");
  const hasPendingChanges = filterFields.some(
    (key) => draftFilters[key] !== appliedFilters[key],
  ) || search.trim() !== (activeQuery.search ?? "");
  const filterOptions = {
    functionName: data.filterOptions.functionName,
    orgUnit: data.filterOptions.orgUnit,
    range: data.filterOptions.range,
    location: data.filterOptions.location,
    gender: data.filterOptions.gender,
    employmentType: data.filterOptions.directOrIndirect,
  };
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

  const navigate = (filters: DashboardFilters, searchValue: string) => {
    const params = toSearchParams(filters, searchValue);
    setIsLoading(true);
    startTransition(() => {
      router.push(params.size ? `/employee-360?${params.toString()}` : "/employee-360");
    });
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
      <section className="employee-360__controls" aria-label="Employee search and filters">
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
            <button className="a-button a-button--secondary employee-360__filter-toggle" type="button" aria-expanded={areFiltersOpen} aria-controls="employee-360-filter-panel" onClick={() => setAreFiltersOpen((open) => !open)}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" />
              <span className="a-button__label">Filters</span>
              {activeFilters.length > 0 && <strong>{activeFilters.length}</strong>}
            </button>
          </div>

          {(activeQuery.search || activeFilters.length > 0) && <div className="employee-360__active-filters">
            <span>Current view:</span>
            {activeQuery.search && <strong>Search: {activeQuery.search}</strong>}
            {activeFilters.map((key) => <strong key={key}>{filterLabels[key]}: {appliedFilters[key]}</strong>)}
            <button className="a-button a-button--integrated -small" type="button" onClick={() => { setSearch(""); setDraftFilters(emptyDashboardFilters); navigate(emptyDashboardFilters, ""); }}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
              <span className="a-button__label">Clear all</span>
            </button>
          </div>}

          {areFiltersOpen && <div className="employee-360__filter-panel" id="employee-360-filter-panel">
            <div className="employee-360__filter-grid">
              {filterFields.map((key) => <label key={key}>
                <span>{filterLabels[key]}</span>
                <select value={draftFilters[key]} onChange={(event) => setDraftFilters((current) => ({ ...current, [key]: event.target.value }))}>
                  <option value="All">All</option>
                  {filterOptions[key].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>)}
            </div>
            <div className="employee-360__filter-footer">
              <p aria-live="polite">{hasPendingChanges ? "Changes are ready to apply." : activeFilters.length > 0 ? `${activeFilters.length} filters applied.` : "No filters applied."}</p>
              <div>
                <button className="a-button a-button--secondary -small" type="button" onClick={() => { setDraftFilters(emptyDashboardFilters); navigate(emptyDashboardFilters, search); }}><span className="a-button__label">Reset filters</span></button>
                <button className="a-button a-button--primary -small" type="submit">
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
      />
    </main>
  );
}