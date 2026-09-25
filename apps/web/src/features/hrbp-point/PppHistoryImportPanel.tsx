"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { httpPppHistoryImportClient } from "./ppp-history-import.http";
import {
  pppColumnLabel,
  pppImportColumns,
  type PppImportColumn,
  type PppPreview,
  type PppPreviewFilter,
  type PppPreviewRow,
} from "./ppp-history-import.types";

const pageSize = 25;
const contextColumns: readonly PppImportColumn[] = [
  "pers_no", "personnel_number", "employee_subgroup", "ps_group", "organizational_unit", "range", "function",
];

export function PppHistoryImportPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PppPreview | null>(null);
  const [filter, setFilter] = useState<PppPreviewFilter>("all");
  const [page, setPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [editingRow, setEditingRow] = useState<PppPreviewRow | null>(null);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleColumns = showAllColumns ? pppImportColumns : contextColumns;

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
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const nextPreview = await httpPppHistoryImportClient.createPreview(file);
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

  const loadPage = async (nextFilter: PppPreviewFilter, nextPage: number) => {
    if (!preview) return;
    setBusy(true);
    try {
      const nextPreview = await httpPppHistoryImportClient.getRows(preview.id, nextFilter, nextPage, pageSize);
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
      let nextPreview = await httpPppHistoryImportClient.updateRow(preview.id, editingRow, filter, currentPage, pageSize);
      const lastPage = Math.max(1, Math.ceil(nextPreview.filteredRows / pageSize));
      if (nextPreview.page > lastPage) nextPreview = await httpPppHistoryImportClient.getRows(preview.id, filter, lastPage, pageSize);
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
      await httpPppHistoryImportClient.cancel(preview.id);
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
      const result = await httpPppHistoryImportClient.commit(preview, confirmReplacement);
      dialogRef.current?.close();
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(`Imported ${result.employees} employees into ${result.yearlyRows} yearly records. ${result.skippedRows} unknown rows skipped.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The preview could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="namelist-panel namelist-panel--ppp" aria-labelledby="ppp-history-import-title">
        <div className="namelist-panel__header">
          <div><p className="namelist-panel__eyebrow">Employee history</p><h2 id="ppp-history-import-title">PPP history upload</h2><p>Replace the rolling three-year Performance, Position, Person, and TCL dataset.</p></div>
          <div className="namelist-panel__status"><span className="namelist-panel__mode"><i className="a-icon boschicon-bosch-ic-chart-bar" aria-hidden="true" /> Annual history</span><small>Current year + 2 prior years</small></div>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-upload">
            <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
            <div><strong>Select PPP history workbook</strong><p>CSV or XLSX · 50 MB maximum · 25,000 rows</p></div>
            <input ref={fileInputRef} id="ppp-history-file" className="visually-hidden" type="file" accept=".csv,.xlsx" onChange={selectFile} />
            <label className="a-button a-button--secondary" htmlFor="ppp-history-file"><span className="a-button__label">Choose file</span></label>
          </div>
          {file && <div className="namelist-file"><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><span><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><button className="a-button a-button--primary" type="button" disabled={busy} onClick={upload}><span className="a-button__label">{busy ? "Preparing..." : "Upload and preview"}</span></button></div>}
          <p className="namelist-panel__notice">Headers must contain the current year and two prior years. Live history changes only after confirmation.</p>
          {message && <p className="namelist-panel__message" role="status">{message}</p>}
        </div>
      </section>

      <dialog className="namelist-dialog ppp-history-dialog" ref={dialogRef} onClose={() => setEditingRow(null)}>
        {preview && <div className="namelist-dialog__layout">
          <header className="namelist-dialog__header"><div><span>PPP history preview</span><h2>{preview.fileName}</h2><p>{preview.currentYear}, {preview.currentYear - 1}, {preview.currentYear - 2} · {preview.totalRows} employee rows</p></div><button className="a-button a-button--integrated" type="button" aria-label="Close preview" title="Close" disabled={busy} onClick={() => dialogRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
          <div className="namelist-summary ppp-history-summary" aria-label="Preview summary"><div><span>Total</span><strong>{preview.totalRows}</strong></div><div><span>Valid</span><strong>{preview.validRows}</strong></div><div className={preview.warningRows ? "is-warning" : ""}><span>Skipped</span><strong>{preview.warningRows}</strong></div><div className={preview.invalidRows ? "is-error" : ""}><span>Invalid</span><strong>{preview.invalidRows}</strong></div><p>{preview.invalidRows ? "Correct invalid rows before importing." : preview.warningRows ? "Unknown employees will be skipped." : "All rows are ready to import."}</p></div>
          {message && <p className="namelist-dialog__message" role="alert">{message}</p>}
          <div className="namelist-toolbar"><div className="namelist-segments" aria-label="Filter preview rows">{(["all", "valid", "warning", "invalid"] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void loadPage(value, 1)}>{value === "warning" ? "Skipped" : value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="namelist-toolbar__view"><span>{preview.filteredRows} rows</span><label htmlFor="ppp-column-view">Columns</label><select id="ppp-column-view" value={showAllColumns ? "all" : "context"} onChange={(event) => setShowAllColumns(event.target.value === "all")}><option value="context">Employee fields</option><option value="all">All 19 fields</option></select></div></div>
          <div className={`namelist-grid ${showAllColumns ? "is-all-columns" : ""}`}><table><thead><tr><th scope="col">Row</th><th scope="col">Status</th>{visibleColumns.map((column) => <th scope="col" key={column}>{pppColumnLabel(column, preview.currentYear)}</th>)}<th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{preview.rows.map((row) => { const hasError = row.issues.some((issue) => issue.severity === "error"); const hasWarning = row.issues.some((issue) => issue.severity === "warning"); return <tr key={row.rowNumber} className={hasError ? "is-invalid" : hasWarning ? "is-warning" : ""}><td>{row.rowNumber}</td><td><span className={`namelist-status ${hasError ? "is-invalid" : hasWarning ? "is-warning" : "is-valid"}`}>{hasError ? `${row.issues.length} issues` : hasWarning ? "Will skip" : "Valid"}</span></td>{visibleColumns.map((column) => <td key={column} title={row.issues.find((issue) => issue.column === column)?.message}>{row.values[column] || "-"}</td>)}<td><button className="a-button a-button--integrated -small" type="button" aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => setEditingRow(structuredClone(row))}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button></td></tr>; })}</tbody></table></div>
          <div className="namelist-pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || currentPage === 1} onClick={() => void loadPage(filter, currentPage - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {currentPage} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || currentPage === pageCount} onClick={() => void loadPage(filter, currentPage + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div>
          {editingRow && <aside className="namelist-editor" aria-labelledby="ppp-row-editor-title"><div className="namelist-editor__header"><div><span>Row {editingRow.rowNumber}</span><h3 id="ppp-row-editor-title">Edit PPP history data</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close row editor" onClick={() => setEditingRow(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div><div className="namelist-editor__fields">{pppImportColumns.map((column) => { const issue = editingRow.issues.find((item) => item.column === column); return <label className={`hrbp-field ${issue?.severity === "error" ? "has-error" : ""}`} key={column}><span>{pppColumnLabel(column, preview.currentYear)}</span><input type="text" value={editingRow.values[column]} disabled={busy} onChange={(event) => setEditingRow((current) => current ? { ...current, values: { ...current.values, [column]: event.target.value } } : current)} />{issue && <small>{issue.message}</small>}</label>; })}</div><div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditingRow(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={saveRow}><span className="a-button__label">{busy ? "Validating..." : "Save row"}</span></button></div></aside>}
          <footer className="namelist-dialog__footer">{preview.hasExistingHistory ? <label className="namelist-confirm"><input type="checkbox" checked={confirmReplacement} onChange={(event) => setConfirmReplacement(event.target.checked)} /><span>I understand this replaces the complete PPP history dataset.</span></label> : <span />}<div><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => void cancelPreview()}><span className="a-button__label">Cancel preview</span></button><button className="a-button a-button--primary" type="button" disabled={busy || preview.invalidRows > 0 || preview.validRows + preview.warningRows === preview.warningRows || (preview.hasExistingHistory && !confirmReplacement)} onClick={commit}><span className="a-button__label">{busy ? "Processing..." : "Push PPP history"}</span></button></div></footer>
        </div>}
      </dialog>
    </>
  );
}
