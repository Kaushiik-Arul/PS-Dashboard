"use client";

import { useId, useState, type ReactNode } from "react";
import { useAuth } from "@/src/auth/AuthProvider";
import { hasPermission } from "@/src/auth/permissions";
import "./data-table.css";

export interface DataTableColumn<Row extends object> {
  key: keyof Row;
  label: string;
  group: string;
  filterable?: boolean;
  render?: (value: Row[keyof Row], row: Row) => ReactNode;
}

interface DataTableProps<Row extends object> {
  title: string;
  description: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  downloadFileName: string;
  pageSizeOptions?: number[];
}

function escapeCsvValue(value: unknown) {
  let text = value == null ? "" : String(value);

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function DataTable<Row extends object>({
  title,
  description,
  columns,
  rows,
  getRowKey,
  downloadFileName,
  pageSizeOptions = [5, 10, 25],
}: DataTableProps<Row>) {
  const { role } = useAuth();
  const canDownload = hasPermission(role, "exportCharts");
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  const menuId = useId();
  const filterableColumns = columns.filter((column) => column.filterable);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const filterPanelId = `${downloadFileName}-filters`;
  const filteredRows = rows.filter((row) =>
    filterableColumns.every((column) => {
      const selectedValue = filters[String(column.key)];
      return !selectedValue || String(row[column.key]) === selectedValue;
    }),
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const downloadCsv = () => {
    const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
    const body = filteredRows.map((row) =>
      columns.map((column) => escapeCsvValue(row[column.key])).join(","),
    );
    const csv = [header, ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = downloadFileName.endsWith(".csv") ? downloadFileName : `${downloadFileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="data-table-card" aria-label={title}>
      <header className="data-table-card__header">
        <div>
          <h2 className="data-table-card__title">{title}</h2>
          {isDescriptionVisible && <p className="data-table-card__description">{description}</p>}
        </div>
        <div className="data-table-card__actions">
          <div
            className="data-table-card__menu-control"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsMenuOpen(false);
              }
            }}
          >
            <button
              className="a-button a-button--integrated data-table-card__action"
              type="button"
              aria-label={`Options for ${title}`}
              aria-controls={menuId}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <i className="a-icon a-button__icon boschicon-bosch-ic-options" aria-hidden="true" />
            </button>
            {isMenuOpen && (
              <div className="a-box data-table-card__menu" id={menuId} role="menu">
                <button
                  className="a-button a-button--integrated -small"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsDescriptionVisible((visible) => !visible);
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="a-button__label">{isDescriptionVisible ? "Hide context" : "Show context"}</span>
                </button>
                <button
                  className="a-button a-button--integrated -small"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setFilters({});
                    setCurrentPage(1);
                    setPageSize(pageSizeOptions[0] ?? 10);
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="a-button__label">Reset table view</span>
                </button>
              </div>
            )}
          </div>
          {filterableColumns.length > 0 && (
            <button
              className="a-button a-button--integrated data-table-card__action"
              type="button"
              aria-label={`${areFiltersOpen ? "Hide" : "Show"} filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
              aria-controls={filterPanelId}
              aria-expanded={areFiltersOpen}
              title="Filter table"
              onClick={() => setAreFiltersOpen((open) => !open)}
            >
              <i
                className={`a-icon a-button__icon boschicon-bosch-ic-filter${activeFilterCount > 0 ? "-success" : ""}`}
                aria-hidden="true"
              />
            </button>
          )}
          {canDownload && (
            <button
              className="a-button a-button--integrated data-table-card__action"
              type="button"
              aria-label={`Download ${title}`}
              title="Download CSV"
              onClick={downloadCsv}
            >
              <i className="a-icon a-button__icon boschicon-bosch-ic-download" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {filterableColumns.length > 0 && areFiltersOpen && (
        <div className="data-table__filters" id={filterPanelId} aria-label={`${title} filters`}>
          {filterableColumns.map((column) => {
            const key = String(column.key);
            const options = Array.from(
              new Set(rows.map((row) => String(row[column.key] ?? ""))),
            ).filter(Boolean).sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));

            return (
              <label className="data-table__filter" key={key}>
                <span>{column.label}</span>
                <select
                  value={filters[key] ?? ""}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, [key]: event.target.value }));
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            );
          })}
          {Object.values(filters).some(Boolean) && (
            <button
              className="a-button a-button--secondary -small"
              type="button"
              onClick={() => {
                setFilters({});
                setCurrentPage(1);
              }}
            >
              <span className="a-button__label">Clear filters</span>
            </button>
          )}
        </div>
      )}

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr className="data-table__column-header">
              {columns.map((column) => (
                <th key={String(column.key)} scope="col">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? visibleRows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => {
                  const value = row[column.key];
                  return <td key={String(column.key)}>{column.render ? column.render(value, row) : String(value ?? "-")}</td>;
                })}
              </tr>
            )) : (
              <tr><td colSpan={columns.length}>No records available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="data-table__footer">
        <span className="data-table__summary">
          Showing {filteredRows.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, filteredRows.length)} of {filteredRows.length} positions
          {filteredRows.length !== rows.length ? ` (${rows.length} total)` : ""}
        </span>
        <div className="data-table__pagination">
          <button
            className="a-button a-button--integrated"
            type="button"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" />
          </button>
          <span className="data-table__page-status">Page {safePage} of {pageCount}</span>
          <button
            className="a-button a-button--integrated"
            type="button"
            aria-label="Next page"
            disabled={safePage === pageCount}
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          >
            <i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" />
          </button>
        </div>
        <label className="data-table__page-size">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
          >
            {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </footer>
    </section>
  );
}
