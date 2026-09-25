"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import { namelistColumns, type NamelistColumn } from "./namelist-import.types";
import { httpRbinCleaningClient } from "./rbin-cleaning.http";
import type { RbinBatchSummary, RbinColumnView, RbinPreviewPage, RbinPreviewRow, RbinRowFilter } from "./rbin-cleaning.types";

const pageSizeOptions = [25, 50, 100] as const;
const filters: readonly RbinRowFilter[] = ["all", "valid", "invalid", "new", "changed", "unchanged"];
const keyColumns: readonly NamelistColumn[] = [
  "pers_no",
  "personnel_number",
  "employee_group",
  "ps_group",
  "organizational_unit",
  "range",
  "function",
  "location",
  "direct_or_indirect",
];
const labels = Object.fromEntries(namelistColumns.map((column) => [column, column.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")])) as Record<NamelistColumn, string>;

function displayValue(column: NamelistColumn, value: string) {
  return column === "direct_or_indirect" ? formatDirectOrIndirect(value) : value;
}

type EditingCell = { rowNumber: number; column: NamelistColumn; value: string };

function formatTimestamp(value: string | null) {
  if (!value) return "Not exported";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: RbinBatchSummary["status"]) {
  if (status === "ready_for_export") return "Ready for export";
  return status[0].toUpperCase() + status.slice(1);
}

function reportingMonthLabel(value: string | undefined): string {
  return value?.slice(0, 7) || "Month unavailable";
}

export function RbinNamelistCleaningPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reportingMonth, setReportingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [batches, setBatches] = useState<RbinBatchSummary[]>([]);
  const [preview, setPreview] = useState<RbinPreviewPage | null>(null);
  const [filter, setFilter] = useState<RbinRowFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showSavedDatasets, setShowSavedDatasets] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void httpRbinCleaningClient.listBatches()
      .then(setBatches)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Saved datasets could not be loaded."));
  }, []);

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleColumns = showAllColumns ? namelistColumns : keyColumns;
  const columnView: RbinColumnView = showAllColumns ? "all" : "key";
  const editable = preview?.status === "draft";
  const editingRow = editing ? preview?.rows.find((row) => row.rowNumber === editing.rowNumber) ?? null : null;

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage("");
    if (!selected) return setFile(null);
    if (!/\.(csv|xlsx)$/i.test(selected.name) || selected.size > 50 * 1024 * 1024) {
      setFile(null);
      setMessage(/\.(csv|xlsx)$/i.test(selected.name) ? "Choose a file smaller than 50 MB." : "Choose a CSV or XLSX file.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  };

  const showPreview = (nextPreview: RbinPreviewPage) => {
    setPreview(nextPreview);
    setFilter(nextPreview.filter);
    setSearchInput(nextPreview.search);
    setSearch(nextPreview.search);
    setPage(nextPreview.page);
    setEditing(null);
    dialogRef.current?.showModal();
  };

  const upload = async () => {
    if (!file || !reportingMonth) return;
    setBusy(true);
    setMessage("");
    try {
      showPreview(await httpRbinCleaningClient.createPreview(file, reportingMonth, pageSize));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The preview could not be prepared.");
    } finally { setBusy(false); }
  };

  const openBatch = async (batchId: string) => {
    setBusy(true);
    setMessage("");
    try { showPreview(await httpRbinCleaningClient.getRows(batchId, "all", 1, pageSize, "", columnView)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The batch could not be opened."); }
    finally { setBusy(false); }
  };

  const loadPage = async (nextFilter: RbinRowFilter, nextPage: number) => {
    if (!preview) return;
    setBusy(true);
    setEditing(null);
    try {
      const next = await httpRbinCleaningClient.getRows(preview.id, nextFilter, nextPage, pageSize, search, columnView);
      setPreview(next); setFilter(nextFilter); setPage(nextPage);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The rows could not be refreshed."); }
    finally { setBusy(false); }
  };

  const searchRows = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview) return;
    const nextSearch = searchInput.trim();
    setBusy(true);
    setEditing(null);
    try {
      const next = await httpRbinCleaningClient.getRows(preview.id, filter, 1, pageSize, nextSearch, columnView);
      setPreview(next); setSearch(nextSearch); setPage(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The rows could not be searched."); }
    finally { setBusy(false); }
  };

  const clearSearch = async () => {
    if (!preview) return;
    setBusy(true);
    setEditing(null);
    try {
      const next = await httpRbinCleaningClient.getRows(preview.id, filter, 1, pageSize, "", columnView);
      setPreview(next); setSearchInput(""); setSearch(""); setPage(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The search could not be cleared."); }
    finally { setBusy(false); }
  };

  const changePageSize = async (nextPageSize: number) => {
    if (!preview) return;
    setBusy(true);
    setEditing(null);
    try {
      const next = await httpRbinCleaningClient.getRows(preview.id, filter, 1, nextPageSize, search, columnView);
      setPreview(next); setPageSize(nextPageSize); setPage(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The rows could not be refreshed."); }
    finally { setBusy(false); }
  };

  const saveCell = async (row: RbinPreviewRow) => {
    if (!preview || !editing) return;
    setBusy(true);
    try {
      const changedRow = { ...row, values: { ...row.values, [editing.column]: editing.value } };
      const next = await httpRbinCleaningClient.updateRow(preview.id, changedRow, filter, currentPage, pageSize, search, columnView);
      setPreview(next); setEditing(null); setBatches(await httpRbinCleaningClient.listBatches());
    } catch (error) { setMessage(error instanceof Error ? error.message : "The cell could not be saved."); }
    finally { setBusy(false); }
  };

  const changeColumnView = async (nextView: RbinColumnView) => {
    if (!preview || filter !== "changed") {
      setShowAllColumns(nextView === "all");
      return;
    }
    setBusy(true);
    setEditing(null);
    try {
      const next = await httpRbinCleaningClient.getRows(preview.id, filter, 1, pageSize, search, nextView);
      setPreview(next); setShowAllColumns(nextView === "all"); setPage(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The column view could not be changed."); }
    finally { setBusy(false); }
  };

  const finalize = async () => {
    if (!preview) return;
    setBusy(true); setMessage("");
    try {
      const next = await httpRbinCleaningClient.finalize(preview.id, pageSize);
      setPreview(next); setBatches(await httpRbinCleaningClient.listBatches());
      setFilter("all"); setSearchInput(""); setSearch(""); setPage(1);
      setMessage("Cleaned dataset saved and ready for export.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The dataset could not be saved."); }
    finally { setBusy(false); }
  };

  const exportBatch = async () => {
    if (!preview) return;
    setBusy(true); setMessage("");
    try {
      const result = await httpRbinCleaningClient.exportBatch(preview.id);
      const next = await httpRbinCleaningClient.getRows(preview.id, filter, currentPage, pageSize, search, columnView);
      setPreview(next); setBatches(await httpRbinCleaningClient.listBatches());
      setMessage(`${result.fileName} downloaded.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The export could not be prepared."); }
    finally { setBusy(false); }
  };

  return <>
    <section className="namelist-panel namelist-panel--rbin" aria-labelledby="rbin-namelist-title">
      <div className="namelist-panel__header">
        <div><p className="namelist-panel__eyebrow">Data conversion</p><h2 id="rbin-namelist-title">RBIN Namelist to PS Namelist</h2><p>Clean, compare, edit, and export RBIN employee data.</p></div>
        <span className="namelist-panel__mode rbin-mode"><i className="a-icon boschicon-bosch-ic-document-settings" aria-hidden="true" /> RBIN cleaning</span>
      </div>
      <div className="namelist-panel__body">
        <div className="namelist-upload">
          <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
          <div><strong>Select mixed employee file</strong><p>Active, Inbound, and Outbound · CSV or XLSX · 50 MB maximum</p></div>
          <input ref={fileInputRef} id="rbin-file" className="visually-hidden" type="file" accept=".csv,.xlsx" onChange={selectFile} />
          <label className="a-button a-button--secondary" htmlFor="rbin-file"><span className="a-button__label">Choose file</span></label>
        </div>
        {file && <div className="namelist-file"><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><span><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><label className="rbin-reporting-month"><span>Reporting month</span><input type="month" required max={new Date().toISOString().slice(0, 7)} value={reportingMonth} disabled={busy} onChange={(event) => setReportingMonth(event.target.value)} /></label><button className="a-button a-button--primary" type="button" disabled={busy || !reportingMonth} onClick={() => void upload()}><span className="a-button__label">{busy ? "Preparing..." : "Upload and preview"}</span></button></div>}
        {message && <p className="namelist-panel__message" role="status">{message}</p>}
        <div className="rbin-batches" aria-label="Saved cleaning batches">
          <button className="rbin-batches__heading" type="button" aria-expanded={showSavedDatasets} aria-controls="rbin-saved-datasets" disabled={batches.length === 0} onClick={() => setShowSavedDatasets((visible) => !visible)}><strong>Saved datasets</strong><span>{batches.length}</span></button>
          <div id="rbin-saved-datasets" hidden={!showSavedDatasets}>
            {batches.map((batch) => <button className="rbin-batch-row" type="button" key={batch.id} disabled={busy} onClick={() => void openBatch(batch.id)}>
              <i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" />
              <span><strong>{batch.fileName}</strong><small>{reportingMonthLabel(batch.reportingMonth)} · {formatTimestamp(batch.createdAt)} · {batch.stagedRows} staged rows</small></span>
              <em data-status={batch.status}>{statusLabel(batch.status)}</em>
              <i className="a-icon boschicon-bosch-ic-forward-right" aria-hidden="true" />
            </button>)}
          </div>
        </div>
      </div>
    </section>

    <dialog className="namelist-dialog rbin-dialog" ref={dialogRef} onClose={() => setEditing(null)}>
      {preview && <div className="namelist-dialog__layout">
        <header className="namelist-dialog__header"><div><span>RBIN cleaning preview</span><h2>{preview.fileName}</h2><p>{reportingMonthLabel(preview.reportingMonth)} · {statusLabel(preview.status)} · {preview.totalRawRows} source rows · permanent dataset</p></div><button className="a-button a-button--integrated" type="button" aria-label="Close preview" disabled={busy} onClick={() => dialogRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
        <div className="rbin-summary" aria-label="Cleaning summary">
          <div className="rbin-summary__primary">{[{ label: "Raw file", value: preview.totalRawRows }, { label: "PS staged", value: preview.stagedRows }, { label: "Excluded", value: preview.excludedRows }, { label: "Invalid", value: preview.invalidRows }].map((item) => <div key={item.label} className={item.label === "Invalid" && item.value ? "is-error" : ""}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
          <div className="rbin-summary__secondary"><span className="is-valid"><strong>{preview.validRows}</strong> valid</span><span className="is-new"><strong>{preview.newRows}</strong> new</span><span className="is-changed"><strong>{preview.changedRows}</strong> changed</span><span className="is-unchanged"><strong>{preview.unchangedRows}</strong> unchanged</span></div>
        </div>
        {preview.mappingAlerts.length > 0 && <section className="rbin-mapping-alert" role="alert" aria-labelledby="mapping-alert-title">
          <i className="a-icon boschicon-bosch-ic-alert-error" aria-hidden="true" />
          <div className="rbin-mapping-alert__content"><div><h3 id="mapping-alert-title">{preview.mappingAlerts.reduce((total, alert) => total + alert.rowCount, 0)} rows have missing mappings</h3><p>Enter the missing values before saving.</p></div><ul>{preview.mappingAlerts.map((alert) => <li key={alert.organizationalUnit}><strong>{alert.organizationalUnit}</strong><span>{[alert.missingRange && "Range", alert.missingFunction && "Function"].filter(Boolean).join(" + ")}</span></li>)}</ul></div>
        </section>}
        {message && <p className="namelist-dialog__message" role="status">{message}</p>}
        <div className="namelist-toolbar"><div className="namelist-segments rbin-segments" aria-label="Filter staged rows">{filters.map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void loadPage(value, 1)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="namelist-toolbar__view"><form className="rbin-search" role="search" onSubmit={(event) => void searchRows(event)}><input type="search" value={searchInput} disabled={busy} aria-label="Search Pers.No. or Personnel Number" placeholder="Pers.No. or Personnel Number" onChange={(event) => setSearchInput(event.target.value)} /><button className="a-button a-button--integrated -small" type="submit" disabled={busy} aria-label="Search staged rows"><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button>{search && <button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label="Clear staged row search" title="Clear search" onClick={() => void clearSearch()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>}</form><span>{preview.filteredRows} rows</span><label htmlFor="rbin-column-view">View</label><select id="rbin-column-view" value={columnView} disabled={busy} onChange={(event) => void changeColumnView(event.target.value as RbinColumnView)}><option value="key">Review fields</option><option value="all">All 29 fields</option></select></div></div>
        <div className={`namelist-grid rbin-grid ${showAllColumns ? "is-all-columns" : ""}`}><table><thead><tr><th scope="col">Row</th><th scope="col">Status</th>{visibleColumns.map((column) => <th scope="col" key={column}>{labels[column]}</th>)}</tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className={row.issues.length ? "is-invalid" : ""}><td>{row.rowNumber}</td><td><span className={`rbin-comparison is-${row.comparisonStatus}`}>{row.comparisonStatus}</span>{row.issues.length > 0 && <small>{row.issues.length} issues</small>}</td>{visibleColumns.map((column) => {
          const issue = row.issues.find((item) => item.column === column);
          const changed = row.changedColumns.includes(column);
          const mappingSource = column === "range" ? row.rangeSource : column === "function" ? row.functionSource : null;
          return <td key={column} className={`${issue ? "has-issue" : ""} ${changed ? "has-change" : ""}`} title={issue?.message}>
            <button className="rbin-cell-value" type="button" disabled={!editable || busy} aria-label={editable ? `Edit ${labels[column]} for row ${row.rowNumber}` : undefined} onClick={() => editable && setEditing({ rowNumber: row.rowNumber, column, value: row.values[column] })}><span>{displayValue(column, row.values[column]) || "-"}</span>{mappingSource && <small data-source={mappingSource}>{mappingSource}</small>}{changed && row.baselineValues && <small>Was: {displayValue(column, row.baselineValues[column]) || "-"}</small>}{issue && <small>{issue.message}</small>}{editable && <i className="a-icon boschicon-bosch-ic-edit rbin-cell-value__edit" aria-hidden="true" />}</button>
          </td>;
        })}</tr>)}</tbody></table></div>
        <div className="namelist-pagination"><label className="namelist-pagination__size" htmlFor="rbin-page-size"><span>Rows per page</span><select id="rbin-page-size" value={pageSize} disabled={busy} onChange={(event) => void changePageSize(Number(event.target.value))}>{pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || currentPage === 1} onClick={() => void loadPage(filter, currentPage - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {currentPage} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || currentPage === pageCount} onClick={() => void loadPage(filter, currentPage + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div>
        {editing && editingRow && <aside className="rbin-cell-panel" aria-labelledby="rbin-cell-editor-title">
          <header><div><span>Row {editing.rowNumber}</span><h3 id="rbin-cell-editor-title">Edit {labels[editing.column]}</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close cell editor" onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
          <div className="rbin-cell-panel__context"><span>Organizational Unit</span><strong>{editingRow.values.organizational_unit}</strong></div>
          {editingRow.issues.find((issue) => issue.column === editing.column) && <p className="rbin-cell-panel__issue"><i className="a-icon boschicon-bosch-ic-alert-error" aria-hidden="true" /> {editingRow.issues.find((issue) => issue.column === editing.column)?.message}</p>}
          {editingRow.baselineValues && <div className="rbin-cell-panel__previous"><span>Current PS namelist value</span><strong>{editingRow.baselineValues[editing.column] || "Blank"}</strong></div>}
          <label className="hrbp-field"><span>Cleaned value</span><input autoFocus value={editing.value} disabled={busy} onChange={(event) => setEditing({ ...editing, value: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") void saveCell(editingRow); if (event.key === "Escape") setEditing(null); }} /></label>
          <footer><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void saveCell(editingRow)}><i className="a-icon a-button__icon boschicon-bosch-ic-checkmark" aria-hidden="true" /><span className="a-button__label">Save value</span></button></footer>
        </aside>}
        <footer className="namelist-dialog__footer"><span className="rbin-export-meta">Last export: {formatTimestamp(preview.lastExportedAt)}</span><div><button className="a-button a-button--secondary" type="button" disabled={busy || preview.status === "draft"} onClick={() => void exportBatch()}><i className="a-icon a-button__icon boschicon-bosch-ic-download" aria-hidden="true" /><span className="a-button__label">Export XLSX</span></button><button className="a-button a-button--primary" type="button" disabled={busy || preview.status !== "draft" || preview.invalidRows > 0} onClick={() => void finalize()}><span className="a-button__label">{busy ? "Processing..." : "Save cleaned dataset"}</span></button></div></footer>
      </div>}
    </dialog>
  </>;
}