"use client";

import { PoolSelect } from "./PoolSelect";
import { useRef, useState, type ChangeEvent } from "react";
import { poolClient } from "./pool-register.http";
import {
  columnsFor,
  hasErrors,
  poolTitles,
  type PoolKind,
  type PoolPreview,
  type PoolPreviewRow,
} from "./pool-register.types";

export function PoolImportPanel({
  kind,
  onCommitted,
}: {
  kind: PoolKind;
  onCommitted?: () => void;
}) {
  const title = poolTitles[kind];
  const stepColumns = columnsFor(kind);
  const client = poolClient(kind);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PoolPreview | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "warning" | "invalid">(
    "all",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<PoolPreviewRow | null>(null);
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage("");
    if (
      selected &&
      (!/\.xlsx$/i.test(selected.name) || selected.size > 50 * 1024 * 1024)
    ) {
      setFile(null);
      event.target.value = "";
      setMessage("Choose an XLSX file smaller than 50 MB.");
    } else setFile(selected);
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
  const load = async (nextFilter: typeof filter, page: number) => {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      setPreview(await client.preview(preview.id, nextFilter, page));
      setFilter(nextFilter);
      setEditing(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load preview.",
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    dialogRef.current?.close();
    setPreview(null);
    setFile(null);
    setConfirmed(false);
    setEditing(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const saveRow = async () => {
    if (!preview || !editing) return;
    setBusy(true);
    setMessage("");
    try {
      await client.updateRow(preview.id, editing.rowNumber, editing.values);
      setConfirmed(false);
      setPreview(
        await client.preview(
          preview.id,
          filter,
          filter === "all" ? preview.page : 1,
        ),
      );
      setEditing(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update row.",
      );
    } finally {
      setBusy(false);
    }
  };
  const deleteRow = async (row: PoolPreviewRow) => {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      await client.deleteRow(preview.id, row.rowNumber);
      const remaining = Math.max(0, preview.filteredRows - 1);
      const targetPage = Math.min(
        preview.page,
        Math.max(1, Math.ceil(remaining / 25)),
      );
      setConfirmed(false);
      setPreview(await client.preview(preview.id, filter, targetPage));
      if (editing?.rowNumber === row.rowNumber) setEditing(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete row.",
      );
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await client.cancel(preview.id);
      reset();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not cancel preview.",
      );
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    if (!preview || !confirmed || preview.invalidRows) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await client.commit(preview.id);
      reset();
      onCommitted?.();
      setMessage(
        `${title} updated: ${result.importedRows} rows imported, ${result.replacedRows} previous rows replaced.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };
  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));
  const visibleColumns = stepColumns;
  return (
    <>
      <section
        className="namelist-panel"
        aria-labelledby={`${kind}-import-title`}
      >
        <div className="namelist-panel__header">
          <div>
            <p className="namelist-panel__eyebrow">Talent Landscape</p>
            <h2 id={`${kind}-import-title`}>{title} upload</h2>
            <p>
              Preview the workbook before replacing all current pool data.
            </p>
          </div>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-upload">
            <i
              className="a-icon boschicon-bosch-ic-upload"
              aria-hidden="true"
            />
            <div>
              <strong>Select {title} workbook</strong>
              <p>XLSX · 50 MB maximum · 25,000 rows</p>
            </div>
            <input
              ref={fileRef}
              id={`${kind}-file`}
              className="visually-hidden"
              type="file"
              accept=".xlsx"
              onChange={chooseFile}
            />
            <label
              className="a-button a-button--secondary"
              htmlFor={`${kind}-file`}
            >
              <span className="a-button__label">Choose file</span>
            </label>
          </div>
          {file && (
            <div className="namelist-file">
              <span>
                <strong>{file.name}</strong>
              </span>
              <button
                type="button"
                className="a-button a-button--primary"
                disabled={busy}
                onClick={() => void upload()}
              >
                <span className="a-button__label">
                  {busy ? "Preparing..." : "Upload and preview"}
                </span>
              </button>
            </div>
          )}
          {message && (
            <p className="namelist-panel__message" role="status">
              {message}
            </p>
          )}
        </div>
      </section>
      <dialog
        className="namelist-dialog"
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) void cancel();
        }}
      >
        {preview && (
          <div className="namelist-dialog__layout">
            <header className="namelist-dialog__header">
              <div>
                <span>{title} preview</span>
                <h2>{preview.fileName}</h2>
                <p>
                  {preview.existingRows} current rows will be replaced after
                  confirmation.
                </p>
              </div>
              <button
                className="a-button a-button--integrated"
                type="button"
                aria-label="Close"
                disabled={busy}
                onClick={() => void cancel()}
              >
                <i
                  className="a-icon a-button__icon boschicon-bosch-ic-close"
                  aria-hidden="true"
                />
              </button>
            </header>
            <div className="namelist-summary jd-preview-summary">
              <div>
                <span>Total</span>
                <strong>{preview.totalRows}</strong>
              </div>
              <div>
                <span>Valid</span>
                <strong>{preview.validRows}</strong>
              </div>
              <div className={preview.warningRows ? "is-warning" : ""}>
                <span>Warnings</span>
                <strong>{preview.warningRows}</strong>
              </div>
              <div className={preview.invalidRows ? "is-error" : ""}>
                <span>Invalid</span>
                <strong>{preview.invalidRows}</strong>
              </div>
              <p>
                {preview.invalidRows
                  ? "Check the errors under each value; edit or delete the row before replacing."
                  : "All rows are ready for replacement."}
              </p>
            </div>
            {message && (
              <p className="namelist-dialog__message" role="alert">
                {message}
              </p>
            )}
            <div className="namelist-toolbar">
              <div className="namelist-segments">
                {(["all", "valid", "warning", "invalid"] as const).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={busy}
                      aria-pressed={filter === value}
                      onClick={() => void load(value, 1)}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
              <span>{preview.filteredRows} rows</span>
            </div>
            <div className="namelist-grid active-step-preview-grid">
              <table>
                <thead>
                  <tr>
                    <th>Excel row</th>
                    <th>Status</th>
                    {visibleColumns.map(([key, title]) => (
                      <th key={key}>{title}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        hasErrors(row.issues)
                          ? "is-invalid"
                          : row.issues.length
                            ? "is-warning"
                            : ""
                      }
                    >
                      <td>{row.rowNumber}</td>
                      <td>
                        <span
                          className={`namelist-status ${hasErrors(row.issues) ? "is-invalid" : row.issues.length ? "is-warning" : "is-valid"}`}
                        >
                          {row.issues.length
                            ? `${row.issues.length} ${row.issues.length === 1 ? "issue" : "issues"}`
                            : "Valid"}
                        </span>
                      </td>
                      {visibleColumns.map(([key]) => {
                        const issues = row.issues.filter(
                          (issue) => issue.column === key,
                        );
                        return (
                          <td
                            key={key}
                            className={
                              hasErrors(issues) ? "has-issues" : undefined
                            }
                          >
                            <span>{row.values[key] || "-"}</span>
                            {issues.map((issue, index) => (
                              <small
                                className={`active-step-cell-issue ${issue.severity === "warning" ? "pool-warning" : ""}`}
                                key={`${issue.message}-${index}`}
                              >
                                {issue.message}
                              </small>
                            ))}
                          </td>
                        );
                      })}
                      <td className="active-step-row-actions">
                        <button
                          className="a-button a-button--integrated -small"
                          type="button"
                          disabled={busy}
                          aria-label={`Edit row ${row.rowNumber}`}
                          title="Edit row"
                          onClick={() => {
                            setMessage("");
                            setEditing(structuredClone(row));
                          }}
                        >
                          <i
                            className="a-icon a-button__icon boschicon-bosch-ic-edit"
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          className="a-button a-button--integrated -small"
                          type="button"
                          disabled={busy || preview.totalRows <= 1}
                          aria-label={`Delete row ${row.rowNumber}`}
                          title="Delete row"
                          onClick={() => void deleteRow(row)}
                        >
                          <i
                            className="a-icon a-button__icon boschicon-bosch-ic-delete"
                            aria-hidden="true"
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="namelist-pagination">
              <button
                className="a-button a-button--integrated -small"
                type="button"
                aria-label="Previous page"
                disabled={busy || preview.page === 1}
                onClick={() => void load(filter, preview.page - 1)}
              >
                <i
                  className="a-icon a-button__icon boschicon-bosch-ic-back-left"
                  aria-hidden="true"
                />
              </button>
              <span>
                Page {preview.page} of {pageCount}
              </span>
              <button
                className="a-button a-button--integrated -small"
                type="button"
                aria-label="Next page"
                disabled={busy || preview.page >= pageCount}
                onClick={() => void load(filter, preview.page + 1)}
              >
                <i
                  className="a-icon a-button__icon boschicon-bosch-ic-forward-right"
                  aria-hidden="true"
                />
              </button>
            </div>
            {editing && (
              <aside
                className="namelist-editor"
                aria-labelledby={`${kind}-editor-title`}
              >
                <div className="namelist-editor__header">
                  <div>
                    <span>Excel row {editing.rowNumber}</span>
                    <h3 id={`${kind}-editor-title`}>Edit {title} row</h3>
                  </div>
                  <button
                    className="a-button a-button--integrated"
                    type="button"
                    aria-label="Close row editor"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    <i
                      className="a-icon a-button__icon boschicon-bosch-ic-close"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div className="namelist-editor__fields">
                  {stepColumns.map(([key, title]) => {
                    const issues = editing.issues.filter(
                      (issue) => issue.column === key,
                    );
                    return (
                      <label
                        className={`hrbp-field ${hasErrors(issues) ? "has-error" : ""}`}
                        key={key}
                      >
                        <span>{title}</span>
                        {key === "pool" ? <PoolSelect kind={kind} value={editing.values.pool} disabled={busy} onChange={pool => setEditing(current => current ? { ...current, values: { ...current.values, pool } } : null)} /> : (
                        <input
                          type="text"
                          value={editing.values[key]}
                          disabled={busy}
                          onChange={(event) =>
                            setEditing((current) =>
                              current
                                ? {
                                    ...current,
                                    values: {
                                      ...current.values,
                                      [key]: event.target.value,
                                    },
                                  }
                                : null,
                            )
                          }
                        />
                        )}
                        {issues.map((issue, index) => (
                          <small
                            className={
                              issue.severity === "warning"
                                ? "pool-warning"
                                : undefined
                            }
                            key={`${issue.message}-${index}`}
                          >
                            {issue.message}
                          </small>
                        ))}
                      </label>
                    );
                  })}
                  {message && (
                    <p role="alert" className="hrbp-dialog__error">
                      {message}
                    </p>
                  )}
                </div>
                <div className="namelist-editor__footer">
                  <button
                    className="a-button a-button--secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    <span className="a-button__label">Cancel</span>
                  </button>
                  <button
                    className="a-button a-button--primary"
                    type="button"
                    disabled={busy}
                    onClick={() => void saveRow()}
                  >
                    <span className="a-button__label">
                      {busy ? "Saving..." : "Save row"}
                    </span>
                  </button>
                </div>
              </aside>
            )}
            <footer className="namelist-dialog__footer">
              <label className="namelist-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I understand this deletes and replaces every current {title}{" "}
                  row.
                </span>
              </label>
              <button
                className="a-button a-button--primary"
                type="button"
                disabled={
                  busy || !!editing || !confirmed || preview.invalidRows > 0
                }
                onClick={() => void commit()}
              >
                <span className="a-button__label">
                  {busy ? "Processing..." : `Replace ${title}`}
                </span>
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
