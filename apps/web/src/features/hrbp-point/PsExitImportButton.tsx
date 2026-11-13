'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { attritionColumns, type AttritionValues } from './attrition-import.types';
import { psExitImportClient as client } from './ps-exit-import.http';
import type { PsExitPreview, PsExitPreviewFilter, PsExitPreviewRow } from './ps-exit-import.types';

const hasSeverity = (row: PsExitPreviewRow, severity: 'error' | 'warning') =>
  row.issues.some((issue) => issue.severity === severity);

function displayDate(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

function displayPeriod(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function classificationLabel(value: PsExitPreviewRow['classification']) {
  if (value === 'out_of_ps_transfer') return 'Out-of-PS transfer';
  if (!value) return 'Unclassified';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PsExitImportButton({ onCommitted }: { onCommitted: () => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PsExitPreview | null>(null);
  const [filter, setFilter] = useState<PsExitPreviewFilter>('all');
  const [editing, setEditing] = useState<PsExitPreviewRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSuccess(''); setMessage('');
    if (!/\.xlsx$/i.test(file.name) || file.size > 50 * 1024 * 1024) {
      setMessage('Choose an XLSX file smaller than 50 MB.');
      return;
    }
    setBusy(true);
    try {
      const next = await client.upload(file);
      setPreview(next); setFilter('all'); setConfirmed(false); setEditing(null);
      dialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PS Exit upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const load = async (nextFilter: PsExitPreviewFilter, period: string, page: number) => {
    if (!preview) return;
    setBusy(true); setMessage('');
    try {
      setPreview(await client.preview(preview.id, nextFilter, period, page));
      setFilter(nextFilter); setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the PS Exit preview.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    dialogRef.current?.close();
    setPreview(null); setEditing(null); setConfirmed(false); setMessage('');
  };

  const cancel = async () => {
    if (!preview) return reset();
    setBusy(true);
    try { await client.cancel(preview.id); reset(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not cancel the preview.'); }
    finally { setBusy(false); }
  };

  const saveRow = async () => {
    if (!preview || !editing) return;
    setBusy(true); setMessage('');
    try {
      await client.updateRow(preview.id, editing.rowNumber, editing.values);
      setConfirmed(false);
      setPreview(await client.preview(preview.id, filter, preview.period, filter === 'all' ? preview.page : 1));
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the row.');
    } finally { setBusy(false); }
  };

  const deleteRow = async (row: PsExitPreviewRow) => {
    if (!preview) return;
    setBusy(true); setMessage('');
    try {
      await client.deleteRow(preview.id, row.rowNumber);
      const remaining = Math.max(0, preview.filteredRows - 1);
      const targetPage = Math.min(preview.page, Math.max(1, Math.ceil(remaining / 25)));
      setConfirmed(false);
      setPreview(await client.preview(preview.id, filter, preview.period, targetPage));
      if (editing?.rowNumber === row.rowNumber) setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete the row.');
    } finally { setBusy(false); }
  };

  const commit = async () => {
    if (!preview || !preview.period || !confirmed || preview.errorRows > 0) return;
    setBusy(true); setMessage('');
    try {
      const result = await client.commit(preview.id, preview.period);
      reset();
      setSuccess(`${result.importedRows} rows processed: ${result.insertedEvents + result.updatedEvents} confirmed, ${result.matchedCandidates} tracked departures matched, and ${result.pendingPsExit} PS Exit records left pending.`);
      await onCommitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PS Exit import failed.');
    } finally { setBusy(false); }
  };

  return <>
    <div className="ps-exit-import-action">
      <input ref={fileRef} className="visually-hidden" type="file" accept=".xlsx" onChange={(event) => void chooseFile(event)} />
      <button className="a-button a-button--primary -small" type="button" disabled={busy} onClick={() => fileRef.current?.click()}><i className="a-icon a-button__icon boschicon-bosch-ic-upload" aria-hidden="true" /><span className="a-button__label">{busy ? 'Preparing...' : 'Upload PS Exit data'}</span></button>
      {(success || (!preview && message)) && <span className={message ? 'is-error' : ''} role="status">{message || success}</span>}
    </div>

    <dialog className="namelist-dialog ps-exit-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!busy) void cancel(); }}>
      {preview && <div className="namelist-dialog__layout">
        <header className="namelist-dialog__header"><div><span>PS Exit preview</span><h2>{preview.fileName}</h2><p>{preview.periods.length} LWD {preview.periods.length === 1 ? 'month' : 'months'} from {displayDate(preview.minimumLwd)} to {displayDate(preview.maximumLwd)}</p></div><button className="a-button a-button--integrated" type="button" aria-label="Close PS Exit preview" disabled={busy} onClick={() => void cancel()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>

        <div className="namelist-summary ps-exit-preview-summary">
          <div><span>Total</span><strong>{preview.totalRows}</strong></div>
          <div className={preview.warningRows ? 'is-warning' : ''}><span>Warnings</span><strong>{preview.warningRows}</strong></div>
          <div className={preview.errorRows ? 'is-error' : ''}><span>Errors</span><strong>{preview.errorRows}</strong></div>
          <div><span>Raw retention</span><strong>{displayPeriod(preview.retainedPeriod)}</strong></div>
          <p>{!preview.period ? 'Select one LWD month to review and save.' : preview.errorRows ? 'Resolve every blocking LWD, reason, duplicate, or event conflict before saving.' : `Only ${displayPeriod(preview.period)} will be reconciled. Matched records become confirmed events; unmatched records remain pending.`}</p>
        </div>
        {message && <p className="namelist-dialog__message" role="alert">{message}</p>}

        <div className="namelist-toolbar"><div className="namelist-segments" aria-label="Filter PS Exit preview rows">{(['all', 'warnings', 'errors'] as const).map((value) => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => void load(value, preview.period, 1)}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div><label className="ps-exit-period-filter"><span>LWD month</span><select value={preview.period} disabled={busy} onChange={(event) => void load(filter, event.target.value, 1)}><option value="">All months</option>{preview.periods.map((period) => <option key={period} value={period}>{displayPeriod(period)}</option>)}</select></label><span>{preview.filteredRows} rows</span></div>

        <div className="namelist-grid succession-preview-grid ps-exit-preview-grid"><table><colgroup><col className="succession-preview-col--row" /><col className="succession-preview-col--status" /><col />{attritionColumns.map(([key]) => <col key={key} />)}<col className="succession-preview-col--actions" /></colgroup><thead><tr className="succession-preview-columns"><th className="succession-preview-row-number">Excel row</th><th className="succession-preview-status">Status</th><th>Classification</th>{attritionColumns.map(([key, label]) => <th key={key}>{label}</th>)}<th className="succession-preview-actions">Actions</th></tr></thead><tbody>{preview.rows.map((row) => {
          const hasErrors = hasSeverity(row, 'error');
          const hasWarnings = hasSeverity(row, 'warning');
          return <tr key={row.rowNumber} className={hasErrors ? 'has-errors' : hasWarnings ? 'has-warnings' : undefined}><td className="succession-preview-row-number">{row.rowNumber}</td><td className="succession-preview-status"><span className={`namelist-status ${hasErrors ? 'is-error' : hasWarnings ? 'is-warning' : 'is-clear'}`}>{row.issues.length ? `${row.issues.length} ${row.issues.length === 1 ? 'issue' : 'issues'}` : 'Clear'}</span></td><td><span className={`ps-exit-classification ps-exit-classification--${row.classification ?? 'invalid'}`}>{classificationLabel(row.classification)}</span></td>{attritionColumns.map(([key]) => {
            const issues = row.issues.filter((issue) => issue.column === key);
            return <td key={key} className={issues.length ? hasErrors ? 'has-errors' : 'has-warnings' : undefined}><span>{row.values[key] || '-'}</span>{issues.map((issue, index) => <small className="active-step-cell-warning" key={`${issue.code}-${index}`}>{issue.message}</small>)}</td>;
          })}<td className="active-step-row-actions succession-preview-actions"><button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => { setMessage(''); setEditing(structuredClone(row)); }}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" disabled={busy || preview.totalRows <= 1} aria-label={`Delete row ${row.rowNumber}`} title="Delete row" onClick={() => void deleteRow(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></td></tr>;
        })}</tbody></table></div>

        <div className="namelist-pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous PS Exit preview page" disabled={busy || preview.page === 1} onClick={() => void load(filter, preview.period, preview.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {preview.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next PS Exit preview page" disabled={busy || preview.page >= pageCount} onClick={() => void load(filter, preview.period, preview.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div>

        {editing && <aside className="namelist-editor" aria-labelledby="ps-exit-row-editor-title"><div className="namelist-editor__header"><div><span>Excel row {editing.rowNumber}</span><h3 id="ps-exit-row-editor-title">Edit PS Exit row</h3></div><button className="a-button a-button--integrated" type="button" aria-label="Close row editor" disabled={busy} onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div><div className="namelist-editor__fields">{attritionColumns.map(([key, label, group]) => {
          const issues = editing.issues.filter((issue) => issue.column === key);
          const isDate = key === 'initiated_date_raw' || key === 'lwd_raw';
          return <label className={`hrbp-field ${issues.length ? 'has-warning' : ''}`} key={key}><span>{group} · {label}</span><input type="text" placeholder={isDate ? 'DD.MM.YYYY' : undefined} value={editing.values[key]} disabled={busy} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, [key]: event.target.value, ...(key === 'range' ? { range_source: 'uploaded' as const } : {}) } } : null)} />{issues.map((issue, index) => <small key={`${issue.code}-${index}`}>{issue.message}</small>)}</label>;
        })}</div><div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void saveRow()}><span className="a-button__label">{busy ? 'Saving...' : 'Save row'}</span></button></div></aside>}

        <footer className="namelist-dialog__footer"><label className="namelist-confirm"><input type="checkbox" checked={confirmed} disabled={!preview.period} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm reconciliation of {displayPeriod(preview.period || null)} only.</span></label><div><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => void cancel()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy || !!editing || !preview.period || !confirmed || preview.errorRows > 0} onClick={() => void commit()}><span className="a-button__label">{busy ? 'Saving...' : 'Save selected month'}</span></button></div></footer>
      </div>}
    </dialog>
  </>;
}