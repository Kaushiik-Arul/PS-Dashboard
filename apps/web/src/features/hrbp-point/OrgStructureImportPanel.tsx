'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { orgStructureImportClient } from './org-structure-import.http';
import {
  orgStructureColumns,
  type OrgStructurePreview,
  type OrgStructurePreviewRow,
} from './org-structure-import.types';

export function OrgStructureImportPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OrgStructurePreview | null>(null);
  const [editing, setEditing] = useState<OrgStructurePreviewRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setMessage('');
    if (selected && (!/\.xlsx$/i.test(selected.name) || selected.size > 50 * 1024 * 1024)) {
      setFile(null);
      event.target.value = '';
      setMessage('Choose an XLSX file smaller than 50 MB.');
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await orgStructureImportClient.upload(file);
      setPreview(result);
      setEditing(null);
      setConfirmed(false);
      dialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const load = async (page: number) => {
    if (!preview) return;
    setBusy(true);
    setMessage('');
    try {
      setPreview(await orgStructureImportClient.preview(preview.id, page));
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load preview.');
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
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveRow = async () => {
    if (!preview || !editing) return;
    setBusy(true);
    setMessage('');
    try {
      await orgStructureImportClient.updateRow(preview.id, editing.rowNumber, editing.values);
      setPreview(await orgStructureImportClient.preview(preview.id, preview.page));
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update row.');
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (row: OrgStructurePreviewRow) => {
    if (!preview) return;
    setBusy(true);
    setMessage('');
    try {
      await orgStructureImportClient.deleteRow(preview.id, row.rowNumber);
      const remaining = Math.max(0, preview.filteredRows - 1);
      const targetPage = Math.min(preview.page, Math.max(1, Math.ceil(remaining / 25)));
      setPreview(await orgStructureImportClient.preview(preview.id, targetPage));
      if (editing?.rowNumber === row.rowNumber) setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete row.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await orgStructureImportClient.cancel(preview.id);
      reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not cancel preview.');
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview || !confirmed) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await orgStructureImportClient.commit(preview.id);
      reset();
      setMessage(`Org structure updated: ${result.importedRows} rows imported, ${result.replacedRows} previous rows replaced.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));

  return <>
    <section className="namelist-panel" aria-labelledby="org-structure-import-title">
      <div className="namelist-panel__header">
        <div>
          <p className="namelist-panel__eyebrow">Organization</p>
          <h2 id="org-structure-import-title">Org Structure upload</h2>
          <p>Preview and adjust reporting relationships before replacing the current org structure.</p>
        </div>
      </div>
      <div className="namelist-panel__body">
        <div className="namelist-upload">
          <i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" />
          <div><strong>Select org structure workbook</strong><p>XLSX · 50 MB maximum · 25,000 rows</p></div>
          <input ref={fileRef} id="org-structure-file" className="visually-hidden" type="file" accept=".xlsx" onChange={chooseFile} />
          <label className="a-button a-button--secondary" htmlFor="org-structure-file"><span className="a-button__label">Choose file</span></label>
        </div>
        {file && <div className="namelist-file">
          <span><strong>{file.name}</strong></span>
          <button type="button" className="a-button a-button--primary" disabled={busy} onClick={() => void upload()}>
            <span className="a-button__label">{busy ? 'Preparing...' : 'Upload and preview'}</span>
          </button>
        </div>}
        {message && <p className="namelist-panel__message" role="status">{message}</p>}
      </div>
    </section>

    <dialog className="namelist-dialog" ref={dialogRef}>
      {preview && <div className="namelist-dialog__layout">
        <header className="namelist-dialog__header">
          <div>
            <span>Org Structure preview</span>
            <h2>{preview.fileName}</h2>
            <p>{preview.existingRows} current rows will be replaced after confirmation.</p>
          </div>
          <button className="a-button a-button--integrated" type="button" aria-label="Close" disabled={busy} onClick={() => void cancel()}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" />
          </button>
        </header>

        <div className="namelist-summary org-structure-preview-summary">
          <div><span>Rows in file</span><strong>{preview.totalRows}</strong></div>
          <div><span>Current rows</span><strong>{preview.existingRows}</strong></div>
          <p>All rows can be edited or deleted before replacement. No business validation is applied.</p>
        </div>
        {message && <p className="namelist-dialog__message" role="alert">{message}</p>}
        <div className="namelist-toolbar"><span>{preview.filteredRows} rows</span></div>

        <div className="namelist-grid org-structure-preview-grid">
          <table>
            <thead><tr><th>Excel row</th>{orgStructureColumns.map(([key, title]) => <th key={key}>{title}</th>)}<th>Actions</th></tr></thead>
            <tbody>{preview.rows.map((row) => <tr key={row.rowNumber}>
              <td>{row.rowNumber}</td>
              {orgStructureColumns.map(([key]) => <td key={key}>
                {key === 'is_active'
                  ? <span className={`namelist-status ${['yes', 'true', '1', 'y'].includes(row.values[key].trim().toLowerCase()) ? 'is-valid' : 'is-invalid'}`}>{['yes', 'true', '1', 'y'].includes(row.values[key].trim().toLowerCase()) ? 'Active' : 'Inactive'}</span>
                  : row.values[key] || '-'}
              </td>)}
              <td className="active-step-row-actions">
                <button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Edit row ${row.rowNumber}`} title="Edit row" onClick={() => { setMessage(''); setEditing(structuredClone(row)); }}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" />
                </button>
                <button className="a-button a-button--integrated -small" type="button" disabled={busy || preview.totalRows <= 1} aria-label={`Delete row ${row.rowNumber}`} title="Delete row" onClick={() => void deleteRow(row)}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" />
                </button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>

        <div className="namelist-pagination">
          <button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={busy || preview.page === 1} onClick={() => void load(preview.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button>
          <span>Page {preview.page} of {pageCount}</span>
          <button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={busy || preview.page >= pageCount} onClick={() => void load(preview.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button>
        </div>

        {editing && <aside className="namelist-editor" aria-labelledby="org-structure-editor-title">
          <div className="namelist-editor__header">
            <div><span>Excel row {editing.rowNumber}</span><h3 id="org-structure-editor-title">Edit org structure row</h3></div>
            <button className="a-button a-button--integrated" type="button" aria-label="Close row editor" disabled={busy} onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
          </div>
          <div className="namelist-editor__fields">
            {orgStructureColumns.map(([key, title]) => <label className="hrbp-field" key={key}>
              <span>{title}</span>
              <input type="text" value={editing.values[key]} disabled={busy} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, [key]: event.target.value } } : null)} />
            </label>)}
            {message && <p role="alert" className="hrbp-dialog__error">{message}</p>}
          </div>
          <div className="namelist-editor__footer">
            <button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button>
            <button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void saveRow()}><span className="a-button__label">{busy ? 'Saving...' : 'Save row'}</span></button>
          </div>
        </aside>}

        <footer className="namelist-dialog__footer">
          <label className="namelist-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this deletes and replaces every current org structure row.</span></label>
          <button className="a-button a-button--primary" type="button" disabled={busy || !confirmed} onClick={() => void commit()}><span className="a-button__label">{busy ? 'Processing...' : 'Replace Org Structure'}</span></button>
        </footer>
      </div>}
    </dialog>
  </>;
}