"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import { areAllOptionsSelected, MultiSelectFilter, reconcileMultiSelectSelection } from "./MultiSelectFilter";
import "./overview-filters.css";

export interface DashboardFilters {
  businessUnit: string[];
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  employmentType: string[];
  hrbp: string[];
}

export type DashboardFilterKey = keyof DashboardFilters;
export type DashboardFilterOptions = Partial<Record<DashboardFilterKey, string[]>>;

type WorkforceFilterOptions = {
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
};

function filterOptionLabel(key: DashboardFilterKey, value: string) {
  return key === "employmentType" ? formatDirectOrIndirect(value) : value;
}

export const emptyDashboardFilters: DashboardFilters = {
  businessUnit: [],
  functionName: [],
  orgUnit: [],
  range: [],
  location: [],
  gender: [],
  employmentType: [],
  hrbp: [],
};

const filterFields: Array<{
  key: DashboardFilterKey;
  label: string;
  options: string[];
}> = [
  { key: "businessUnit", label: "BU", options: ["Mobility Solutions", "Industrial Technology", "Consumer Goods"] },
  { key: "functionName", label: "Function", options: ["Research & development", "Manufacturing", "Logistics", "Quality", "Sales & marketing", "HR", "Others"] },
  { key: "range", label: "Range", options: ["SL2", "SL1", "Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6"] },
  { key: "orgUnit", label: "Org unit", options: ["Engineering", "Operations", "Commercial", "Corporate"] },
  { key: "location", label: "Location", options: ["Bangalore", "Bidadi", "Nashik", "Jaipur", "Pune"] },
  { key: "gender", label: "Gender", options: ["Female", "Male"] },
  { key: "employmentType", label: "Direct / indirect", options: ["Direct", "Indirect"] },
  { key: "hrbp", label: "HRBP", options: ["John Doe", "Priya Sharma", "Michael Chen"] },
];

export function toFilterSelection(value: string | string[] | undefined, options: string[]) {
  if (value === undefined) return [...options];
  return Array.isArray(value) ? value : [value];
}

export function sameFilterSelection(left: string[], right: string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

export function appendFilterValues(
  params: URLSearchParams,
  key: string,
  value: string[],
  allOptions: string[],
) {
  if (value.length === 0 || areAllOptionsSelected(value, allOptions)) return;
  value.forEach((item) => params.append(key, item));
}

export function mapWorkforceFilterOptions(options: WorkforceFilterOptions): DashboardFilterOptions {
  return {
    functionName: options.functionName,
    orgUnit: options.orgUnit,
    range: options.range,
    location: options.location,
    gender: options.gender,
    employmentType: options.directOrIndirect,
  };
}

export function reconcileDashboardFilters(
  filters: DashboardFilters,
  previousOptions: DashboardFilterOptions,
  nextOptions: DashboardFilterOptions,
  changedKey: DashboardFilterKey,
) {
  const reconciled = { ...filters };
  (Object.keys(nextOptions) as DashboardFilterKey[]).forEach((key) => {
    if (key === changedKey) return;
    reconciled[key] = reconcileMultiSelectSelection(
      filters[key],
      previousOptions[key] ?? [],
      nextOptions[key] ?? [],
    );
  });
  return reconciled;
}

interface OverviewFiltersProps {
  value: DashboardFilters;
  activeValue: DashboardFilters;
  period?: string;
  periodOptions?: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (filters: DashboardFilters, changedKey: DashboardFilterKey) => void;
  onPeriodChange?: (period: string) => void;
  onApply: () => void;
  onClear: () => void;
  fields?: readonly DashboardFilterKey[];
  options?: DashboardFilterOptions;
  filtersDisabled?: boolean;
  headerActions?: ReactNode;
}

export function OverviewFilters({
  value,
  activeValue,
  period,
  periodOptions,
  onChange,
  onPeriodChange,
  onApply,
  onClear,
  fields,
  options,
  filtersDisabled = false,
  headerActions,
}: OverviewFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openFilter, setOpenFilter] = useState<DashboardFilterKey | null>(null);
  const filtersRef = useRef<HTMLElement>(null);
  const visibleFields = fields
    ? filterFields.filter((field) => fields.includes(field.key))
    : filterFields;
  const getFieldOptions = (field: (typeof filterFields)[number]) => {
    const available = options?.[field.key] ?? field.options;
    return [...available, ...value[field.key].filter((item) => !available.includes(item))];
  };
  const activeFilters = visibleFields.filter((field) => (
    !areAllOptionsSelected(activeValue[field.key], getFieldOptions(field))
  ));
  const hasPendingChanges = visibleFields.some(
    (field) => !sameFilterSelection(value[field.key], activeValue[field.key]),
  );
  const hasEmptySelection = visibleFields.some((field) => value[field.key].length === 0);
  const snapshotMonthLabel = period && /^\d{4}-\d{2}$/.test(period)
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${period}-01T00:00:00Z`))
    : period;

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <section className="overview-filters -primary" aria-labelledby="overview-filters-title" ref={filtersRef}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <header className="overview-filters__header">
          {filtersDisabled ? (
            <div className="overview-filters__snapshot">
              <i className="a-icon boschicon-bosch-ic-calendar" aria-hidden="true" />
              <div className="overview-filters__snapshot-copy">
                <strong id="overview-filters-title">Monthly snapshot{snapshotMonthLabel ? ` · ${snapshotMonthLabel}` : ""}</strong>
                <span>Saved organization-wide view. Filters are available in Current only.</span>
              </div>
            </div>
          ) : (
            <button
              className="overview-filters__toggle"
              type="button"
              aria-expanded={isExpanded}
              aria-controls="overview-filter-controls"
              onClick={() => { setIsExpanded((expanded) => !expanded); setOpenFilter(null); }}
            >
              <i className="a-icon boschicon-bosch-ic-filter" aria-hidden="true" />
              <span id="overview-filters-title">Filters</span>
              {activeFilters.length > 0 && <strong>{activeFilters.length} active</strong>}
              <i
                className={`a-icon ${isExpanded ? "boschicon-bosch-ic-up" : "boschicon-bosch-ic-down"}`}
                aria-hidden="true"
              />
            </button>
          )}
          <div className="overview-filters__header-actions">
            {headerActions}
            {period !== undefined && periodOptions && onPeriodChange && (
              <div className="a-dropdown overview-filters__period">
                <label htmlFor="dashboard-period">{filtersDisabled ? "Snapshot (MM/YY)" : "Period (MM/YY)"}</label>
                <select id="dashboard-period" value={period} onChange={(event) => onPeriodChange(event.target.value)}>
                  {periodOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
                </select>
              </div>
            )}
            {isExpanded && !filtersDisabled && (
              <button className="a-button a-button--integrated -small" type="button" onClick={onClear}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
                <span className="a-button__label">Clear all</span>
              </button>
            )}
          </div>
        </header>

        {isExpanded && !filtersDisabled && (
          <div className="overview-filters__content" id="overview-filter-controls">
            <div className="overview-filters__grid">
              {visibleFields.map((field) => <MultiSelectFilter
                key={field.key}
                id={`filter-${field.key}`}
                label={field.label}
                options={getFieldOptions(field)}
                value={value[field.key]}
                isOpen={openFilter === field.key}
                onToggle={() => setOpenFilter((current) => current === field.key ? null : field.key)}
                onClose={() => setOpenFilter(null)}
                onChange={(selection) => onChange({ ...value, [field.key]: selection }, field.key)}
                formatOption={(option) => filterOptionLabel(field.key, option)}
              />)}
            </div>

            <div className="overview-filters__footer">
              <p className="overview-filters__status" aria-live="polite">
                {hasEmptySelection
                  ? "Select at least one option in every filter."
                  : hasPendingChanges
                  ? "Changes not applied. Click Apply filters to update the dashboard."
                  : activeFilters.length === 0
                  ? "Showing all employees"
                  : `Filtered by ${activeFilters.map((field) => `${field.label}: ${activeValue[field.key].length === 1 ? filterOptionLabel(field.key, activeValue[field.key][0]) : `${activeValue[field.key].length} selected`}`).join("; ")}`}
              </p>
              <div className="overview-filters__actions">
                <button className="a-button a-button--secondary -small" type="button" onClick={onClear}>
                  <span className="a-button__label">Reset</span>
                </button>
                <button className="a-button -small" type="submit" disabled={hasEmptySelection}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" />
                  <span className="a-button__label">Apply filters</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}