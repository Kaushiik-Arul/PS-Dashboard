"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";
import "./data-table.css";

export interface DataTableColumn<Row extends object> {
  key: keyof Row;
  label: string;
  group: string;
  filterable?: boolean;
  filterType?: "select" | "search" | "date-range";
  exportable?: boolean;
  format?: (value: Row[keyof Row], row: Row) => string;
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
  defaultPageSize?: number;
  groupFilters?: boolean;
  groupedHeaders?: boolean;
  neutralAppearance?: boolean;
  headerActions?: ReactNode;
}

const BLANK_FILTER = "\u0000";

interface DataTableFilterValue {
  value?: string;
  from?: string;
  to?: string;
}

function hasActiveFilter(filter: DataTableFilterValue | undefined) {
  return Boolean(filter?.value || filter?.from || filter?.to);
}

function parseDateValue(value: unknown) {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text)
    ?? /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(text);
  if (!match) return null;

  const isIsoDate = match[1].length === 4;
  const year = Number(isIsoDate ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(isIsoDate ? match[3] : match[1]);
  const date = Date.UTC(year, month - 1, day);
  const parsed = new Date(date);

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? date
    : null;
}

function escapeCsvValue(value: unknown) {
  let text = value == null ? "" : String(value);

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function columnText<Row extends object>(column: DataTableColumn<Row>, row: Row) {
  const value = row[column.key];
  return column.format ? column.format(value, row) : String(value ?? "");
}

export function DataTable<Row extends object>({
  title,
  description,
  columns,
  rows,
  getRowKey,
  downloadFileName,
  pageSizeOptions = [5, 10, 25],
  defaultPageSize,
  groupFilters = false,
  groupedHeaders = false,
  neutralAppearance = false,
  headerActions,
}: DataTableProps<Row>) {
  const { role } = useAuth();
  const canDownload = hasPermission(role, "exportCharts");
  const initialPageSize = defaultPageSize && pageSizeOptions.includes(defaultPageSize)
    ? defaultPageSize
    : (pageSizeOptions[0] ?? 10);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, DataTableFilterValue>>({});
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<string | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const tableCardRef = useRef<HTMLElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const filterableColumns = columns.filter((column) => column.filterable);
  const filterGroupNames = Array.from(new Set(filterableColumns.map((column) => column.group)));
  const currentFilterGroup = selectedFilterGroup ?? filterGroupNames[0];
  const activeFilterCount = Object.values(filters).filter(hasActiveFilter).length;
  const filterPanelId = `${downloadFileName}-filters`;
  const filteredRows = rows.filter((row) =>
    filterableColumns.every((column) => {
      const filter = filters[String(column.key)];
      if (!hasActiveFilter(filter)) return true;

      if (column.filterType === "search") {
        return columnText(column, row).toLocaleLowerCase().includes(filter?.value?.trim().toLocaleLowerCase() ?? "");
      }

      if (column.filterType === "date-range") {
        const value = parseDateValue(row[column.key]);
        if (value === null) return false;
        const from = filter?.from ? parseDateValue(filter.from) : null;
        const to = filter?.to ? parseDateValue(filter.to) : null;
        return (from === null || value >= from) && (to === null || value <= to);
      }

      const selectedValue = filter?.value;
      const value = String(row[column.key] ?? "");
      return selectedValue === BLANK_FILTER ? value === "" : value === selectedValue;
    }),
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const columnHeaderGroups = columns.reduce<Array<{ label: string; span: number }>>((groups, column) => {
    const current = groups.at(-1);
    if (current?.label === column.group) current.span += 1;
    else groups.push({ label: column.group, span: 1 });
    return groups;
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    const expandButton = expandButtonRef.current;
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusableElements = tableCardRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDialogKeyDown);
    expandButton?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeyDown);
      expandButton?.focus();
    };
  }, [isExpanded]);

  const downloadCsv = () => {
    const exportColumns = columns.filter((column) => column.exportable !== false);
    const header = exportColumns.map((column) => escapeCsvValue(column.label)).join(",");
    const body = filteredRows.map((row) =>
      exportColumns.map((column) => escapeCsvValue(columnText(column, row))).join(","),
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
    <section
      ref={tableCardRef}
      className={`data-table-card${isExpanded ? " data-table-card--expanded" : ""}${neutralAppearance ? " data-table-card--neutral" : ""}`}
      aria-label={title}
      aria-modal={isExpanded || undefined}
      role={isExpanded ? "dialog" : undefined}
    >
      <header className="data-table-card__header">
        <div>
          <h2 className="data-table-card__title">{title}</h2>
          {isDescriptionVisible && <p className="data-table-card__description">{description}</p>}
        </div>
        <div className="data-table-card__actions">
          {headerActions}
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
                    setPageSize(initialPageSize);
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
          <button
            ref={expandButtonRef}
            className="a-button a-button--integrated data-table-card__action"
            type="button"
            aria-label={isExpanded ? `Close expanded ${title}` : `Expand ${title}`}
            title={isExpanded ? "Close expanded table" : "Expand table"}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            <i
              className={`a-icon a-button__icon ${isExpanded ? "boschicon-bosch-ic-close" : "boschicon-bosch-ic-fullscreen"}`}
              aria-hidden="true"
            />
          </button>
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
        <div
          className={`data-table__filters${groupFilters ? " data-table__filters--grouped" : ""}`}
          id={filterPanelId}
          aria-label={`${title} filters`}
          style={groupFilters ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr)" } : undefined}
        >
          {groupFilters && <div className="data-table__filter-groups" role="group" aria-label="Filter categories">{filterGroupNames.map((group) => {
            const count = filterableColumns.filter((column) => column.group === group && hasActiveFilter(filters[String(column.key)])).length;
            return <button className="a-button a-button--integrated -small" type="button" key={group} aria-pressed={currentFilterGroup === group} onClick={() => setSelectedFilterGroup(group)}><span className="a-button__label">{group}{count ? ` (${count})` : ""}</span></button>;
          })}</div>}
          <div className="data-table__filter-controls">{filterableColumns.filter((column) => !groupFilters || column.group === currentFilterGroup).map((column) => {
            const key = String(column.key);
            const filter = filters[key];
            const options = Array.from(new Map(
              rows
                .map((row) => [String(row[column.key] ?? ""), columnText(column, row)] as const)
                .filter(([value]) => Boolean(value)),
            )).sort(([, first], [, second]) => first.localeCompare(second, undefined, { numeric: true }));
            const hasBlank = rows.some((row) => row[column.key] == null || row[column.key] === "");

            return (
              <div className="data-table__filter" key={key}>
                <span>{column.label}</span>
                {column.filterType === "search" ? (
                  <input
                    aria-label={`Search ${column.label}`}
                    type="search"
                    placeholder="Search"
                    value={filter?.value ?? ""}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, [key]: { value: event.target.value } }));
                      setCurrentPage(1);
                    }}
                  />
                ) : column.filterType === "date-range" ? (
                  <div className="data-table__date-range">
                    <label className="data-table__date-field">
                      <span>From</span>
                      <input
                        aria-label={`${column.label} from`}
                        type="date"
                        value={filter?.from ?? ""}
                        onChange={(event) => {
                          setFilters((current) => ({ ...current, [key]: { ...current[key], from: event.target.value } }));
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                    <label className="data-table__date-field">
                      <span>To</span>
                      <input
                        aria-label={`${column.label} to`}
                        type="date"
                        value={filter?.to ?? ""}
                        onChange={(event) => {
                          setFilters((current) => ({ ...current, [key]: { ...current[key], to: event.target.value } }));
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <select
                    aria-label={`Filter ${column.label}`}
                    value={filter?.value ?? ""}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, [key]: { value: event.target.value } }));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All</option>
                    {hasBlank && <option value={BLANK_FILTER}>(Blank)</option>}
                    {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                )}
              </div>
            );
          })}</div>
          {Object.values(filters).some(hasActiveFilter) && (
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
        <table className={`data-table${groupedHeaders ? " data-table--grouped" : ""}`}>
          <thead>
            {groupedHeaders && (
              <tr className="data-table__group-header">
                {columnHeaderGroups.map((group, index) => (
                  <th className={`data-table__column-group -group-${(index % 7) + 1}`} colSpan={group.span} key={`${group.label}-${index}`} scope="colgroup">{group.label}</th>
                ))}
              </tr>
            )}
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
                  const text = columnText(column, row);
                  return <td key={String(column.key)}>{column.render ? column.render(value, row) : text || "-"}</td>;
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
