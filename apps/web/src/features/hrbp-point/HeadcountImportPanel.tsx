"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { headcountImportClient } from "./headcount-import.http";
import type { HeadcountPreview } from "./headcount-import.types";

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function HeadcountImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<HeadcountPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage("");
    if (
      selected &&
      (!/\.xlsx$/i.test(selected.name) || selected.size > 50 * 1024 * 1024)
    ) {
      setFile(null);
      event.target.value = "";
      setMessage("Choose an XLSX workbook smaller than 50 MB.");
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await headcountImportClient.upload(file);
      setPreview(result);
      setConfirmed(false);
      dialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    dialogRef.current?.close();
    setPreview(null);
    setFile(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const cancel = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await headcountImportClient.cancel(preview.id);
      reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel preview.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview || preview.issues.length) return;
    const hasReplacements = preview.months.some(
      (month) => month.existingTotalHeadcount !== null,
    );
    if (hasReplacements && !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await headcountImportClient.commit(preview.id, confirmed);
      reset();
      setMessage(
        `${result.importedMonths} months imported; ${result.replacedMonths} existing months replaced.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const hasReplacements = preview?.months.some(
    (month) => month.existingTotalHeadcount !== null,
  ) ?? false;
  const totalEmployees = preview?.months.reduce(
    (total, month) => total + month.totalHeadcount,
    0,
  ) ?? 0;

  return (
    <>
      <section className="namelist-panel namelist-panel--headcount" aria-labelledby="headcount-import-title">
        <div className="namelist-panel__header">
          <div>
            <p className="namelist-panel__eyebrow">Historical workforce data</p>
            <h2 id="headcount-import-title">Monthly headcount import</h2>
            <p>Calculate month and Range totals from PS Namelist workbook sheets.</p>
          </div>
          <span className="namelist-panel__mode namelist-panel__mode--pending">Temporary tool</span>
        </div>
        <div className="namelist-panel__body">
          <div className="namelist-upload">
            <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
            <div>
              <strong>Select PS Namelist workbook</strong>
              <p>XLSX · month/year sheets · 50 MB maximum</p>
            </div>
            <input
              ref={fileRef}
              id="headcount-workbook-file"
              className="visually-hidden"
              type="file"
              accept=".xlsx"
              onChange={chooseFile}
            />
            <label className="a-button a-button--secondary" htmlFor="headcount-workbook-file">
              <span className="a-button__label">Choose file</span>
            </label>
          </div>
          {file && (
            <div className="namelist-file">
              <span><strong>{file.name}</strong></span>
              <button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void upload()}>
                <span className="a-button__label">{busy ? "Calculating..." : "Calculate and preview"}</span>
              </button>
            </div>
          )}
          {message && <p className="namelist-panel__message" role="status">{message}</p>}
        </div>
      </section>

      <dialog
        className="namelist-dialog headcount-dialog"
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
                <span>Monthly headcount preview</span>
                <h2>{preview.fileName}</h2>
                <p>{preview.includedSheets.length} month sheets included · {preview.ignoredSheets.length} other sheets ignored</p>
              </div>
              <button className="a-button a-button--integrated" type="button" aria-label="Close" disabled={busy} onClick={() => void cancel()}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" />
              </button>
            </header>

            <div className="namelist-summary headcount-summary">
              <div><span>Months</span><strong>{preview.months.length}</strong></div>
              <div><span>Employee rows</span><strong>{totalEmployees}</strong></div>
              <div className={hasReplacements ? "is-warning" : ""}>
                <span>Replacements</span>
                <strong>{preview.months.filter((month) => month.existingTotalHeadcount !== null).length}</strong>
              </div>
              <div className={preview.issues.length ? "is-error" : ""}>
                <span>Errors</span><strong>{preview.issues.length}</strong>
              </div>
            </div>

            {preview.issues.length > 0 && (
              <div className="headcount-issues" role="alert">
                <strong>Workbook validation failed</strong>
                <ul>
                  {preview.issues.map((issue, index) => (
                    <li key={`${issue.sheetName}-${issue.rowNumber ?? 0}-${index}`}>
                      <strong>{issue.sheetName}{issue.rowNumber ? `, row ${issue.rowNumber}` : ""}:</strong> {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="headcount-preview">
              <table>
                <thead><tr><th>Reporting month</th><th>Sheet</th><th>New headcount</th><th>Previous</th><th>Ranges</th></tr></thead>
                <tbody>
                  {preview.months.map((month) => (
                    <tr key={month.reportingMonth} className={month.existingTotalHeadcount !== null ? "is-replacement" : ""}>
                      <td><strong>{monthLabel(month.reportingMonth)}</strong></td>
                      <td>{month.sheetName}</td>
                      <td>{month.totalHeadcount}</td>
                      <td>{month.existingTotalHeadcount ?? "New month"}</td>
                      <td>
                        <details className="headcount-ranges">
                          <summary>{month.ranges.length} Ranges</summary>
                          <dl>
                            {month.ranges.map((range) => (
                              <div key={range.rangeKey}><dt>{range.rangeName}</dt><dd>{range.headcount}</dd></div>
                            ))}
                          </dl>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.ignoredSheets.length > 0 && (
              <p className="headcount-ignored"><strong>Ignored sheets:</strong> {preview.ignoredSheets.join(", ")}</p>
            )}

            <footer className="namelist-dialog__footer">
              {hasReplacements ? (
                <label className="namelist-confirm">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  <span>I understand that existing months shown above will be replaced.</span>
                </label>
              ) : <span>All calculated months are new.</span>}
              <button
                className="a-button a-button--primary"
                type="button"
                disabled={busy || preview.issues.length > 0 || (hasReplacements && !confirmed)}
                onClick={() => void commit()}
              >
                <span className="a-button__label">{busy ? "Importing..." : "Import monthly headcount"}</span>
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}