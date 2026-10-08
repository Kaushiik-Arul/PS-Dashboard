"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import "./overview-filters.css";

export interface DashboardFilters {
  businessUnit: string;
  functionName: string;
  orgUnit: string;
  range: string;
  location: string;
  gender: string;
  employmentType: string;
  hrbp: string;
}

export type DashboardFilterKey = keyof DashboardFilters;

function filterOptionLabel(key: DashboardFilterKey, value: string) {
  return key === "employmentType" ? formatDirectOrIndirect(value) : value;
}

export const emptyDashboardFilters: DashboardFilters = {
  businessUnit: "All",
  functionName: "All",
  orgUnit: "All",
  range: "All",
  location: "All",
  gender: "All",
  employmentType: "All",
  hrbp: "All",
};

const filterFields: Array<{
  key: DashboardFilterKey;
  label: string;
  options: string[];
}> = [
  { key: "businessUnit", label: "BU", options: ["All", "Mobility Solutions", "Industrial Technology", "Consumer Goods"] },
  { key: "functionName", label: "Function", options: ["All", "Research & development", "Manufacturing", "Logistics", "Quality", "Sales & marketing", "HR", "Others"] },
  { key: "range", label: "Range", options: ["All", "SL2", "SL1", "Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6"] },
  { key: "orgUnit", label: "Org unit", options: ["All", "Engineering", "Operations", "Commercial", "Corporate"] },
  { key: "location", label: "Location", options: ["All", "Bangalore", "Bidadi", "Nashik", "Jaipur", "Pune"] },
  { key: "gender", label: "Gender", options: ["All", "Female", "Male"] },
  { key: "employmentType", label: "Direct / indirect", options: ["All", "Direct", "Indirect"] },
  { key: "hrbp", label: "HRBP", options: ["All", "John Doe", "Priya Sharma", "Michael Chen"] },
];

interface OverviewFiltersProps {
  value: DashboardFilters;
  activeValue: DashboardFilters;
  period?: string;
  periodOptions?: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (filters: DashboardFilters) => void;
  onPeriodChange?: (period: string) => void;
  onApply: () => void;
  onClear: () => void;
  fields?: readonly DashboardFilterKey[];
  options?: Partial<Record<DashboardFilterKey, string[]>>;
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
  const visibleFields = fields
    ? filterFields.filter((field) => fields.includes(field.key))
    : filterFields;
  const activeFilters = visibleFields.filter((field) => activeValue[field.key] !== "All");
  const hasPendingChanges = visibleFields.some(
    (field) => value[field.key] !== activeValue[field.key],
  );
  const snapshotMonthLabel = period && /^\d{4}-\d{2}$/.test(period)
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${period}-01T00:00:00Z`))
    : period;
  const getFieldOptions = (field: (typeof filterFields)[number]) => {
    const available = options?.[field.key]
      ?? field.options.filter((option) => option !== "All");
    const selected = value[field.key];
    return [
      "All",
      ...(selected !== "All" && !available.includes(selected) ? [selected] : []),
      ...available,
    ];
  };

  return (
    <section className="overview-filters -primary" aria-labelledby="overview-filters-title">
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
              onClick={() => setIsExpanded((expanded) => !expanded)}
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
              {visibleFields.map((field) => (
                <div className="a-dropdown overview-filters__field" key={field.key}>
                  <label htmlFor={`filter-${field.key}`}>{field.label}</label>
                  <select
                    id={`filter-${field.key}`}
                    value={value[field.key]}
                    onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                  >
                    {getFieldOptions(field).map((option) => (
                      <option key={option} value={option}>{filterOptionLabel(field.key, option)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="overview-filters__footer">
              <p className="overview-filters__status" aria-live="polite">
                {hasPendingChanges
                  ? "Changes not applied. Click Apply filters to update the dashboard."
                  : activeFilters.length === 0
                  ? "Showing all employees"
                  : `Filtered by ${activeFilters.map((field) => `${field.label}: ${filterOptionLabel(field.key, activeValue[field.key])}`).join("; ")}`}
              </p>
              <div className="overview-filters__actions">
                <button className="a-button a-button--secondary -small" type="button" onClick={onClear}>
                  <span className="a-button__label">Reset</span>
                </button>
                <button className="a-button -small" type="submit">
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