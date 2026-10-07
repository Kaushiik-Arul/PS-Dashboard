"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { attritionImportClient as client } from "./attrition-import.http";
import {
  attritionColumns,
  type AttritionPreview,
  type AttritionPreviewFilter,
  type AttritionPreviewRow,
} from "./attrition-import.types";

const hasSeverity = (row: AttritionPreviewRow, severity: "error" | "warning") =>
  row.issues.some((issue) => issue.severity === severity);

export function AttritionImportPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AttritionPreview | null>(null);
  const [filter, setFilter] = useState<AttritionPreviewFilter>("all");
  const [editing, setEditing] = useState<AttritionPreviewRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage("");
    if (selected && (!/\.xlsx$/i.test(selected.name) || selected.size > 50 * 1024 * 1024)) {
      setFile(null);
      event.target.value = "";
      setMessage("Choose an XLSX file smaller than 50 MB.");
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await client.upload(file);
      setPreview(result);
      setFilter("all");
      setConfirmed(false);
      setEditing(null);
      dialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const load = async (nextFilter: AttritionPreviewFilter, page: number) => {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      setPreview(await client.preview(preview.id, nextFilter, page));
      setFilter(nextFilter);
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load preview.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    dialogRef.current?.close();
    setPreview(null);
    setFile(null);
    setEditing(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const cancel = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await client.cancel(preview.id);
      reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel preview.");
    } finally {
      setBusy(false);
    }
  };

  const saveRow = async () => {
    if (!preview || !editing) return;
    setBusy(true);
    setMessage("");
    try {
      await client.updateRow(preview.id, editing.rowNumber, editing.values);
      setConfirmed(false);
      setPreview(await client.preview(preview.id, filter, filter === "all" ? preview.page : 1));
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update row.");
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (row: AttritionPreviewRow) => {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      await client.deleteRow(preview.id, row.rowNumber);
      const remaining = Math.max(0, preview.filteredRows - 1);
      const targetPage = Math.min(preview.page, Math.max(1, Math.ceil(remaining / 25)));
      setConfirmed(false);
      setPreview(await client.preview(preview.id, filter, targetPage));
      if (editing?.rowNumber === row.rowNumber) setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete row.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview || !confirmed || preview.errorRows > 0) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await client.commit(preview.id);
      reset();
      setMessage(`Attrition register updated: ${result.importedRows} rows imported, ${result.replacedRows} previous rows replaced.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));

  return (
    <>
      <section className="namelist-panel namelist-panel--attrition" aria-labelledby="attrition-import-title">
        <div className="namelist-panel__header">
          <div>
            <p className="namelist-panel__eyebrow">Attrition</p>
            <h2 id="attrition-import-title">Attrition register upload</h2>
            <p>Review and correct the complete workbook before replacing the current register.</p>
          </div>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-upload">
            <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
            <div><strong>Select Attrition workbook</strong><p>XLSX · one worksheet · 50 MB maximum · 25,000 rows</p></div>
            <input ref={fileRef} id="attrition-import-file" className="visually-hidden" type="file" accept=".xlsx" onChange={chooseFile} />
            <label className="a-button a-button--secondary" htmlFor="attrition-import-file"><span className="a-button__label">Choose file</span></label>
          </div>
          {file && <div className="namelist-file"><span><strong>{file.name}</strong></span><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void upload()}><span className="a-button__label">{busy ? "Preparing..." : "Upload and preview"}</span></button></div>}
          {message && <p className="namelist-panel__message" role="status">{message}</p>}
        </div>
      </section>

      <dialog className="namelist-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!busy) void cancel(); }}>
        {preview && <div className="namelist-dialog__layout">
          <header className="namelist-dialog__header">
            <div><span>Attrition preview</span><h2>{preview.fileName}</h2><p>{preview.existingRows} current rows will be replaced after confirmation.</p></div>
            <button className="a-button a-button--integrated" type="button" aria-label="Close preview" disabled={busy} onClick={() => void cancel()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
          </header>

          <div className="namelist-summary attrition-preview-summary">
            <div><span>Total</span><strong>{preview.totalRows}</strong></div>
            <div className={preview.warningRows ? "is-warning" : ""}><span>Warnings</span><strong>{preview.warningRows}</strong></div>
            <div className={preview.errorRows ? "is-error" : ""}><span>Errors</span><strong>{preview.errorRows}</strong></div>
            <p>{preview.errorRows ? "Resolve blocking employee-number errors before replacement." : preview.warningRows ? "Warnings include duplicates, inferred Ranges, missing mappings, and invalid dates. They do not block replacement." : "No validation issues found."}</p>
          </div>
          {message && <p className="namelist-dialog__message" role="alert">{message}</p>}

          <div className="namelist-toolbar">
            <div className="namelist-segments" aria-label="Filter preview rows">
              {(["all", "warnings", "errors"] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void load(value, 1)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
            </div>
            <span>{preview.filteredRows} rows</span>
          </div>

          <div className="namelist-grid succession-preview-grid attrition-preview-grid">
            <table>
              <colgroup><col className="succession-preview-col--row" /><col className="succession-preview-col--status" />{attritionColumns.map(([key]) => <col key={key} />)}<col className="succession-preview-col--actions" /></colgroup>
              <thead><tr className="succession-preview-columns"><th className="succession-preview-row-number">Excel row</th><th className="succession-preview-status">Status</th>{attritionColumns.map(([key, label]) => <th key={key}>{label}</th>)}<th className="succession-preview-actions">Actions</th></tr></thead>
              <tbody>{preview.rows.map((row) => {
                const hasErrors = hasSeverity(row, "error");
                const hasWarnings = hasSeverity(row, "warning");
                return <tr key={row.rowNumber} className={hasErrors ? "has-errors" : hasWarnings ? "has-warnings" : undefined}>
                  <td className="succession-preview-row-number">{row.rowNumber}</td>
                  <td className="succession-preview-status"><span className={`namelist-status ${hasErrors ? "is-error" : hasWarnings ? "is-warning" : "is-clear"}`}>{row.issues.length ? `${row.issues.length} ${row.issues.length === 1 ? "issue" : "issues"}` : "Clear"}</span></td>
                  {attritionColumns.map(([key]) => {
                    const issues = row.issues.filter((issue) => issue.column === key);
                    return <td key={key} className={issues.length ? hasErrors ? "has-errors" : "has-warnings" : undefined}><span>{row.values[key] || "-"}</span>{issues.map((issue, index) => <small className="active-step-cell-warning" key={`${issue.code}-${index}`}>{issue.message}</small>)}</td>;
                  })}
                  <td className="active-step-row-actions succession-preview-actions">
                    <button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => { setMessage(""); setEditing(structuredClone(row)); }}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>
                    <button className="a-button a-button--integrated -small" type="button" disabled={busy || preview.totalRows <= 1} aria-label={`Delete row ${row.rowNumber}`} title="Delete row" onClick={() => void deleteRow(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="namelist-pagination">
            <button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || preview.page === 1} onClick={() => void load(filter, preview.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button>
            <span>Page {preview.page} of {pageCount}</span>
            <button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || preview.page >= pageCount} onClick={() => void load(filter, preview.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button>
          </div>

          {editing && <aside className="namelist-editor" aria-labelledby="attrition-row-editor-title">
            <div className="namelist-editor__header"><div><span>Excel row {editing.rowNumber}</span><h3 id="attrition-row-editor-title">Edit Attrition row</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close row editor" disabled={busy} onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div>
            <div className="namelist-editor__fields">
              {attritionColumns.map(([key, label, group]) => {
                const issues = editing.issues.filter((issue) => issue.column === key);
                const isDate = key === "initiated_date_raw" || key === "lwd_raw";
                return <label className={`hrbp-field ${issues.length ? "has-warning" : ""}`} key={key}><span>{group} · {label}</span><input type="text" placeholder={isDate ? "DD.MM.YYYY" : undefined} value={editing.values[key]} disabled={busy} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, [key]: event.target.value, ...(key === "range" ? { range_source: "uploaded" as const } : {}) } } : null)} />{issues.map((issue, index) => <small key={`${issue.code}-${index}`}>{issue.message}</small>)}</label>;
              })}
              {message && <p role="alert" className="hrbp-dialog__error">{message}</p>}
            </div>
            <div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void saveRow()}><span className="a-button__label">{busy ? "Saving..." : "Save row"}</span></button></div>
          </aside>}

          <footer className="namelist-dialog__footer">
            <label className="namelist-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this deletes and replaces every current Attrition row.</span></label>
            <button className="a-button a-button--primary" type="button" disabled={busy || !!editing || !confirmed || preview.errorRows > 0} onClick={() => void commit()}><span className="a-button__label">{busy ? "Processing..." : "Replace Attrition register"}</span></button>
          </footer>
        </div>}
      </dialog>
    </>
  );
}