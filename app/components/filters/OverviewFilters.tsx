"use client";

import { useState } from "react";
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
  key: keyof DashboardFilters;
  label: string;
  options: string[];
}> = [
  { key: "businessUnit", label: "BU", options: ["All", "Mobility Solutions", "Industrial Technology", "Consumer Goods"] },
  { key: "functionName", label: "Function", options: ["All", "Research & development", "Manufacturing", "Logistics", "Quality", "Sales & marketing", "HR", "Others"] },
  { key: "orgUnit", label: "Org unit", options: ["All", "Engineering", "Operations", "Commercial", "Corporate"] },
  { key: "range", label: "Range", options: ["All", "SL2", "SL1", "Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6"] },
  { key: "location", label: "Location", options: ["All", "Bangalore", "Bidadi", "Nashik", "Jaipur", "Pune"] },
  { key: "gender", label: "Gender", options: ["All", "Female", "Male"] },
  { key: "employmentType", label: "Direct / indirect", options: ["All", "Direct", "Indirect"] },
  { key: "hrbp", label: "HRBP", options: ["All", "John Doe", "Priya Sharma", "Michael Chen"] },
];

interface OverviewFiltersProps {
  value: DashboardFilters;
  activeValue: DashboardFilters;
  period?: string;
  periodOptions?: string[];
  onChange: (filters: DashboardFilters) => void;
  onPeriodChange?: (period: string) => void;
  onApply: () => void;
  onClear: () => void;
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
}: OverviewFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeFilters = filterFields.filter((field) => activeValue[field.key] !== "All");

  return (
    <section className="overview-filters -primary" aria-labelledby="overview-filters-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <header className="overview-filters__header">
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
          <div className="overview-filters__header-actions">
            {period !== undefined && periodOptions && onPeriodChange && (
              <div className="a-dropdown overview-filters__period">
                <label htmlFor="dashboard-period">Period (MM/YY)</label>
                <select id="dashboard-period" value={period} onChange={(event) => onPeriodChange(event.target.value)}>
                  {periodOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
            )}
            {isExpanded && (
              <button className="a-button a-button--integrated -small" type="button" onClick={onClear}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
                <span className="a-button__label">Clear all</span>
              </button>
            )}
          </div>
        </header>

        {isExpanded && (
          <div className="overview-filters__content" id="overview-filter-controls">
            <div className="overview-filters__grid">
              {filterFields.map((field) => (
                <div className="a-dropdown overview-filters__field" key={field.key}>
                  <label htmlFor={`filter-${field.key}`}>{field.label}</label>
                  <select
                    id={`filter-${field.key}`}
                    value={value[field.key]}
                    onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                  >
                    {field.options.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="overview-filters__footer">
              <p className="overview-filters__status" aria-live="polite">
                {activeFilters.length === 0
                  ? "Showing all employees"
                  : `Filtered by ${activeFilters.map((field) => `${field.label}: ${activeValue[field.key]}`).join("; ")}`}
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