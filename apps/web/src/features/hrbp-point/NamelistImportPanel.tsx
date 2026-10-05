"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import { httpNamelistImportClient } from "./namelist-import.http";
import { RbinNamelistCleaningPanel } from "./RbinNamelistCleaningPanel";
import { RbinMappingsPanel } from "./RbinMappingsPanel";
import { httpRbinMappingsClient } from "./rbin-mappings.http";
import {
  namelistColumns,
  type NamelistColumn,
  type NamelistPreview,
  type NamelistPreviewRow,
  type PreviewFilter,
} from "./namelist-import.types";

const pageSize = 25;
const keyColumns: readonly NamelistColumn[] = [
  "pers_no",
  "personnel_number",
  "employee_group",
  "organizational_unit",
  "range",
  "function",
  "designation_text",
  "official_email",
];
const dateColumns = new Set<NamelistColumn>(["birth_date", "joining_date", "entry_for_retirement", "technical_entry_date"]);
const currentDate = new Date();
const latestHistoricalMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1))
  .toISOString()
  .slice(0, 7);
const labels: Record<NamelistColumn, string> = Object.fromEntries(
  namelistColumns.map((column) => [column, column.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")]),
) as Record<NamelistColumn, string>;

function displayValue(column: NamelistColumn, value: string) {
  return column === "direct_or_indirect" ? formatDirectOrIndirect(value) : value;
}

function formatReportingMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function NamelistImportPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const processDialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<NamelistPreview | null>(null);
  const [filter, setFilter] = useState<PreviewFilter>("all");
  const [page, setPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [editingRow, setEditingRow] = useState<NamelistPreviewRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [importMode, setImportMode] = useState<"live" | "historical">("live");
  const [reportingMonthValue, setReportingMonthValue] = useState(latestHistoricalMonth);

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = preview?.rows ?? [];
  const visibleColumns = showAllColumns ? namelistColumns : keyColumns;
  const invalidCount = preview?.invalidRows ?? 0;

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage("");
    if (!selected) return setFile(null);
    const extensionAllowed = /\.(csv|xlsx)$/i.test(selected.name);
    if (!extensionAllowed || selected.size > 50 * 1024 * 1024) {
      setFile(null);
      setMessage(extensionAllowed ? "Choose a file smaller than 50 MB." : "Choose a CSV or XLSX file.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file || !reportingMonthValue) return;
    setBusy(true);
    setMessage("");
    try {
      const nextPreview = await httpNamelistImportClient.createPreview(
        file,
        reportingMonthValue,
        importMode,
      );
      setPreview(nextPreview);
      setFilter("all");
      setPage(1);
      setShowAllColumns(false);
      setConfirmReplacement(false);
      dialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  };

  const loadPage = async (nextFilter: PreviewFilter, nextPage: number) => {
    if (!preview) return;
    setBusy(true);
    try {
      const nextPreview = await httpNamelistImportClient.getRows(preview.id, nextFilter, nextPage, pageSize);
      setPreview(nextPreview);
      setFilter(nextFilter);
      setPage(nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The preview could not be refreshed.");
    } finally {
      setBusy(false);
    }
  };

  const saveRow = async () => {
    if (!preview || !editingRow) return;
    setBusy(true);
    setMessage("");
    try {
      let nextPreview = await httpNamelistImportClient.updateRow(preview.id, editingRow, filter, currentPage, pageSize);
      const lastPage = Math.max(1, Math.ceil(nextPreview.filteredRows / pageSize));
      if (nextPreview.page > lastPage) {
        nextPreview = await httpNamelistImportClient.getRows(preview.id, filter, lastPage, pageSize);
      }
      setPreview(nextPreview);
      setPage(nextPreview.page);
      setEditingRow(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The row could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const cancelPreview = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await httpNamelistImportClient.cancel(preview.id);
      dialogRef.current?.close();
      setPreview(null);
      setEditingRow(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The preview could not be cancelled.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await httpNamelistImportClient.commit(preview, confirmReplacement);
      dialogRef.current?.close();
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(preview.importMode === "historical"
        ? `Stored ${result.totalRows} historical employee rows for ${preview.reportingMonth}. Live Namelist data was not changed.`
        : `Imported ${result.totalRows} employee rows successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The preview could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const reportingMonth = reportingMonthValue ? formatReportingMonth(reportingMonthValue) : "Select reporting month";

  return <section className="namelist-area" aria-label="Namelist operations">
    <div className="hrbp-workflow-heading">
      <div><p className="hrbp-section__eyebrow">Monthly workflow</p><h1>RBIN and PS Namelist processing</h1><p>Clean RBIN data, validate the PS Namelist, then maintain employee-level records.</p></div>
      <button className="a-button a-button--secondary" type="button" onClick={() => processDialogRef.current?.showModal()}><i className="a-icon a-button__icon boschicon-bosch-ic-info-i" aria-hidden="true" /><span className="a-button__label">View process</span></button>
    </div>
    <div className="namelist-sections">
      <RbinNamelistCleaningPanel />

      <section className="namelist-panel" aria-labelledby="namelist-title">
        <div className="namelist-panel__header">
          <div><p className="namelist-panel__eyebrow">PS data maintenance</p><h2 id="namelist-title">PS Namelist updation</h2><p>Validate and replace the current employee dataset.</p></div>
          <div className="namelist-panel__status"><span className="namelist-panel__mode"><i className="a-icon boschicon-bosch-ic-document-check" aria-hidden="true" /> Validated import</span><small>{reportingMonth} reporting month</small></div>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-import-options">
            <label className="hrbp-field" htmlFor="namelist-import-mode">
              <span>Import destination</span>
              <select
                id="namelist-import-mode"
                value={importMode}
                disabled={busy}
                onChange={(event) => {
                  setImportMode(event.target.value as "live" | "historical");
                  setMessage("");
                }}
              >
                <option value="live">Current live dataset</option>
                <option value="historical">Historical month only</option>
              </select>
            </label>
            <label className="hrbp-field" htmlFor="namelist-reporting-month">
              <span>Reporting month</span>
              <input
                id="namelist-reporting-month"
                type="month"
                max={latestHistoricalMonth}
                value={reportingMonthValue}
                disabled={busy}
                required
                onChange={(event) => setReportingMonthValue(event.target.value)}
              />
            </label>
          </div>
          <div className="namelist-upload">
            <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
            <div><strong>Select cleaned PS Namelist</strong><p>CSV or XLSX · 50 MB maximum · 25,000 rows</p></div>
            <input ref={fileInputRef} id="namelist-file" className="visually-hidden" type="file" accept=".csv,.xlsx" onChange={selectFile} />
            <label className="a-button a-button--secondary" htmlFor="namelist-file"><span className="a-button__label">Choose file</span></label>
          </div>
          {file && <div className="namelist-file"><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><span><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><button className="a-button a-button--primary" type="button" disabled={busy || !reportingMonthValue} onClick={upload}><span className="a-button__label">{busy ? "Preparing..." : "Upload and preview"}</span></button></div>}
          <p className="namelist-panel__notice">{importMode === "historical" ? "Historical imports do not change the current live Namelist." : "Live data changes only after validation and confirmation."}</p>
          {message && <p className="namelist-panel__message" role="status">{message}</p>}
        </div>
      </section>

      <RbinMappingsPanel client={httpRbinMappingsClient} />
    </div>

    <dialog className="hrbp-dialog hrbp-process-dialog" ref={processDialogRef}>
      <div><header className="hrbp-dialog__header"><div><span>HRBP workflow</span><h2>RBIN to PS process</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close process guide" title="Close" onClick={() => processDialogRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
        <div className="hrbp-dialog__body"><section className="hrbp-process-prerequisites"><h3>Before you start</h3><ul><li>Verify Organizational Unit to Range and Function mappings.</li><li>Review employee exceptions and add any required fixed column values.</li></ul></section><ol className="hrbp-process-steps"><li><span>1</span><div><strong>Clean RBIN to PS Namelist</strong><p>Upload the mixed employee file, review mappings and exceptions, correct invalid rows, then export the cleaned PS file.</p></div></li><li><span>2</span><div><strong>Update the PS Namelist</strong><p>Upload the cleaned PS Namelist, validate every row, and confirm the monthly replacement.</p></div></li><li><span>3</span><div><strong>Add employee leave status when needed</strong><p>After the Namelist is current, maintain maternity, sabbatical, CRL, or absconding records.</p></div></li></ol></div>
        <footer className="hrbp-dialog__footer"><button className="a-button a-button--primary" type="button" onClick={() => processDialogRef.current?.close()}><span className="a-button__label">Got it</span></button></footer>
      </div>
    </dialog>

    <dialog className="namelist-dialog" ref={dialogRef} onClose={() => setEditingRow(null)}>
      {preview && <div className="namelist-dialog__layout">
        <header className="namelist-dialog__header"><div><span>{preview.importMode === "historical" ? "Historical Namelist preview" : "Namelist preview"}</span><h2>{preview.fileName}</h2><p>{preview.reportingMonth} · {preview.totalRows} employee rows</p></div><button className="a-button a-button--integrated" type="button" aria-label="Close preview" title="Close" disabled={busy} onClick={() => dialogRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
        <div className="namelist-summary" aria-label="Preview summary"><div><span>Total</span><strong>{preview.totalRows}</strong></div><div><span>Valid</span><strong>{preview.validRows}</strong></div><div className={invalidCount ? "is-error" : ""}><span>Invalid</span><strong>{preview.invalidRows}</strong></div><p>{invalidCount ? "Correct invalid rows before importing." : "All rows passed validation and are ready to import."}</p></div>
        {message && <p className="namelist-dialog__message" role="alert">{message}</p>}
        <div className="namelist-toolbar"><div className="namelist-segments" aria-label="Filter preview rows">{(["all", "valid", "invalid"] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void loadPage(value, 1)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="namelist-toolbar__view"><span>{preview.filteredRows} rows</span><label htmlFor="namelist-column-view">Columns</label><select id="namelist-column-view" value={showAllColumns ? "all" : "key"} onChange={(event) => setShowAllColumns(event.target.value === "all")}><option value="key">Key fields</option><option value="all">All 29 fields</option></select></div></div>
        <div className={`namelist-grid ${showAllColumns ? "is-all-columns" : ""}`}><table><thead><tr><th scope="col">Row</th><th scope="col">Status</th>{visibleColumns.map((column) => <th scope="col" key={column}>{labels[column]}</th>)}<th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.rowNumber} className={row.issues.length ? "is-invalid" : ""}><td>{row.rowNumber}</td><td><span className={`namelist-status ${row.issues.length ? "is-invalid" : "is-valid"}`}>{row.issues.length ? `${row.issues.length} issues` : "Valid"}</span></td>{visibleColumns.map((column) => <td key={column} title={row.issues.find((issue) => issue.column === column)?.message}>{displayValue(column, row.values[column]) || "-"}</td>)}<td><button className="a-button a-button--integrated -small" type="button" aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => setEditingRow(structuredClone(row))}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button></td></tr>)}</tbody></table></div>
        <div className="namelist-pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || currentPage === 1} onClick={() => void loadPage(filter, currentPage - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {currentPage} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || currentPage === pageCount} onClick={() => void loadPage(filter, currentPage + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div>
        {editingRow && <aside className="namelist-editor" aria-labelledby="row-editor-title"><div className="namelist-editor__header"><div><span>Row {editingRow.rowNumber}</span><h3 id="row-editor-title">Edit employee data</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close row editor" onClick={() => setEditingRow(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div><div className="namelist-editor__fields">{namelistColumns.map((column) => { const issue = editingRow.issues.find((item) => item.column === column); return <label className={`hrbp-field ${issue ? "has-error" : ""}`} key={column}><span>{labels[column]}</span><input type={dateColumns.has(column) ? "date" : "text"} value={editingRow.values[column]} disabled={busy} onChange={(event) => setEditingRow((current) => current ? { ...current, values: { ...current.values, [column]: event.target.value } } : current)} />{issue && <small>{issue.message}</small>}</label>; })}</div><div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditingRow(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={saveRow}><span className="a-button__label">{busy ? "Validating..." : "Save row"}</span></button></div></aside>}
        <footer className="namelist-dialog__footer">{preview.hasExistingMonthImport ? <label className="namelist-confirm"><input type="checkbox" checked={confirmReplacement} onChange={(event) => setConfirmReplacement(event.target.checked)} /><span>I understand this replaces the completed {preview.importMode === "historical" ? "historical snapshot" : "live import"} for {preview.reportingMonth}.</span></label> : <span />}<div><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => void cancelPreview()}><span className="a-button__label">Cancel preview</span></button><button className="a-button a-button--primary" type="button" disabled={busy || invalidCount > 0 || (preview.hasExistingMonthImport && !confirmReplacement)} onClick={commit}><span className="a-button__label">{busy ? "Processing..." : preview.importMode === "historical" ? "Store historical month" : "Push namelist"}</span></button></div></footer>
      </div>}
    </dialog>
  </section>;
}