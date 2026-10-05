"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  successionPlanningColumns,
  type SuccessionPlanningPreview,
  type SuccessionPlanningPreviewRow,
} from "@/features/succession-planning/succession-planning.types";
import { successionPlanningImportClient as client } from "./succession-planning.http";

const hasWarnings = (row: SuccessionPlanningPreviewRow) => row.issues.length > 0;

type PreviewFilter = "all" | "warnings";

export function SuccessionPlanningImportPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SuccessionPlanningPreview | null>(null);
  const [filter, setFilter] = useState<PreviewFilter>("all");
  const [editing, setEditing] = useState<SuccessionPlanningPreviewRow | null>(null);
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

  const load = async (nextFilter: PreviewFilter, page: number) => {
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

  const deleteRow = async (row: SuccessionPlanningPreviewRow) => {
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
    if (!preview || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await client.commit(preview.id);
      reset();
      setMessage(`Succession Planning updated: ${result.importedRows} rows imported, ${result.replacedRows} previous rows replaced.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));
  const warningRows = preview?.warningRows ?? 0;
  const warningSummaries = preview?.warningSummaries ?? [];

  return (
    <>
      <section className="namelist-panel" aria-labelledby="succession-planning-import-title">
        <div className="namelist-panel__header">
          <div>
            <p className="namelist-panel__eyebrow">Succession planning</p>
            <h2 id="succession-planning-import-title">Position register upload</h2>
            <p>Review the complete workbook before replacing the current register.</p>
          </div>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-upload">
            <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
            <div><strong>Select Succession Planning workbook</strong><p>XLSX · 50 MB maximum · 25,000 rows</p></div>
            <input ref={fileRef} id="succession-planning-file" className="visually-hidden" type="file" accept=".xlsx" onChange={chooseFile} />
            <label className="a-button a-button--secondary" htmlFor="succession-planning-file"><span className="a-button__label">Choose file</span></label>
          </div>
          {file && <div className="namelist-file"><span><strong>{file.name}</strong></span><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void upload()}><span className="a-button__label">{busy ? "Preparing..." : "Upload and preview"}</span></button></div>}
          {message && <p className="namelist-panel__message" role="status">{message}</p>}
        </div>
      </section>

      <dialog className="namelist-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!busy) void cancel(); }}>
        {preview && <div className="namelist-dialog__layout">
          <header className="namelist-dialog__header">
            <div><span>Succession Planning preview</span><h2>{preview.fileName}</h2><p>{preview.existingRows} current rows will be replaced after confirmation.</p></div>
            <button className="a-button a-button--integrated" type="button" aria-label="Close preview" disabled={busy} onClick={() => void cancel()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
          </header>

          <div className="namelist-summary succession-preview-summary">
            <div><span>Total</span><strong>{preview.totalRows}</strong></div>
            <div className={warningRows ? "is-warning" : ""}><span>Warnings</span><strong>{warningRows}</strong></div>
            <p>{warningRows ? "Warnings identify employees listed more than twice as successors. They do not block replacement." : "No successor allocation warnings found."}</p>
          </div>
          {message && <p className="namelist-dialog__message" role="alert">{message}</p>}

          <div className="namelist-toolbar">
            <div className="namelist-segments" aria-label="Filter preview rows">
              {(["all", "warnings"] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void load(value, 1)}>{value === "all" ? "All" : "Warnings"}</button>)}
            </div>
            <span>{preview.filteredRows} rows</span>
          </div>

          <div className={`namelist-grid succession-preview-grid${filter === "warnings" ? " is-warning-filter" : ""}`}>
            {filter === "warnings" ? (
              <div className="succession-warning-list">
                {warningSummaries.map((summary) => <article className="succession-warning-record" key={summary.employeeNumber}>
                  <header className="succession-warning-record__header">
                    <div><strong>{summary.employeeName || "Name unavailable"}</strong><span>Employee {summary.employeeNumber}</span></div>
                    <span className="succession-warning-count">{summary.occurrences} assignments</span>
                    <p>Listed more than twice as a successor; recommended maximum is 2.</p>
                  </header>
                  <div className="succession-warning-record__assignments">
                    {[1, 2].map((successor) => {
                      const assignments = summary.assignments.filter((assignment) => assignment.successor === successor);
                      return <section key={successor}>
                        <h3>Successor {successor} <span>{assignments.length}</span></h3>
                        {assignments.length ? assignments.map((assignment) => <div className="succession-warning-assignment" key={`${assignment.rowNumber}-${successor}`}>
                          <strong>Excel row {assignment.rowNumber}</strong>
                          <dl>
                            <div><dt>Position</dt><dd>{[assignment.area, assignment.positionJdId, assignment.jdName].filter(Boolean).join(" · ") || "Details unavailable"}</dd></div>
                            <div><dt>Successor details</dt><dd>{[assignment.deptCode, assignment.currentJdId, assignment.readiness, assignment.rating, assignment.idpStatus].filter(Boolean).join(" · ") || "Details unavailable"}</dd></div>
                          </dl>
                        </div>) : <p className="succession-warning-empty">No assignments</p>}
                      </section>;
                    })}
                  </div>
                </article>)}
              </div>
            ) : (
              <table>
                <colgroup>
                  <col className="succession-preview-col--row" />
                  <col className="succession-preview-col--status" />
                  {successionPlanningColumns.map(([key]) => <col key={key} />)}
                  <col className="succession-preview-col--actions" />
                </colgroup>
                <thead><tr className="succession-preview-columns"><th className="succession-preview-row-number">Excel row</th><th className="succession-preview-status">Status</th>{successionPlanningColumns.map(([key, label]) => <th key={key}>{label}</th>)}<th className="succession-preview-actions">Actions</th></tr></thead>
                <tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className={hasWarnings(row) ? "has-warnings" : ""}>
                  <td className="succession-preview-row-number">{row.rowNumber}</td>
                  <td className="succession-preview-status"><span className={`namelist-status ${hasWarnings(row) ? "is-warning" : "is-clear"}`}>{row.issues.length ? `${row.issues.length} ${row.issues.length === 1 ? "warning" : "warnings"}` : "Clear"}</span></td>
                  {successionPlanningColumns.map(([key]) => {
                    const issues = row.issues.filter((issue) => issue.column === key);
                    return <td key={key} className={issues.length ? "has-warnings" : undefined}><span>{row.values[key] || "-"}</span>{issues.map((issue, index) => <small className="active-step-cell-warning" key={`${issue.message}-${index}`}>{issue.message}</small>)}</td>;
                  })}
                  <td className="active-step-row-actions succession-preview-actions">
                    <button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => { setMessage(""); setEditing(structuredClone(row)); }}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>
                    <button className="a-button a-button--integrated -small" type="button" disabled={busy || preview.totalRows <= 1} aria-label={`Delete row ${row.rowNumber}`} title="Delete row" onClick={() => void deleteRow(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
                  </td>
                </tr>)}</tbody>
              </table>
            )}
          </div>

          <div className="namelist-pagination">
            <button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || preview.page === 1} onClick={() => void load(filter, preview.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button>
            <span>Page {preview.page} of {pageCount}</span>
            <button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || preview.page >= pageCount} onClick={() => void load(filter, preview.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button>
          </div>

          {editing && <aside className="namelist-editor" aria-labelledby="succession-row-editor-title">
            <div className="namelist-editor__header"><div><span>Excel row {editing.rowNumber}</span><h3 id="succession-row-editor-title">Edit Succession Planning row</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close row editor" disabled={busy} onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div>
            <div className="namelist-editor__fields">
              {successionPlanningColumns.map(([key, label, group]) => {
                const issues = editing.issues.filter((issue) => issue.column === key);
                return <label className={`hrbp-field ${issues.length ? "has-warning" : ""}`} key={key}><span>{group} · {label}</span><input type="text" value={editing.values[key]} disabled={busy} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, [key]: event.target.value } } : null)} />{issues.map((issue, index) => <small key={`${issue.message}-${index}`}>{issue.message}</small>)}</label>;
              })}
              {message && <p role="alert" className="hrbp-dialog__error">{message}</p>}
            </div>
            <div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void saveRow()}><span className="a-button__label">{busy ? "Saving..." : "Save row"}</span></button></div>
          </aside>}

          <footer className="namelist-dialog__footer">
            <label className="namelist-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this deletes and replaces every current Succession Planning row.</span></label>
            <button className="a-button a-button--primary" type="button" disabled={busy || !!editing || !confirmed} onClick={() => void commit()}><span className="a-button__label">{busy ? "Processing..." : "Replace Succession Planning register"}</span></button>
          </footer>
        </div>}
      </dialog>
    </>
  );
}
