'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { employeeJdImportClient, jobDescriptionsClient } from './jd-management.http';
import type { EmployeeJdPreview, EmployeeJdPreviewFilter, EmployeeJdPreviewRow, JobDescription, JobDescriptionInput, JobDescriptionPage } from './jd-management.types';

const masterPageSize = 8;
const emptyMaster: JobDescriptionPage = { items: [], total: 0, page: 1, pageSize: masterPageSize, search: '' };

function MasterPanel() {
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState(emptyMaster);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<JobDescriptionInput>({ jdId: '', roleTitle: '' });
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobDescription | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const pages = Math.max(1, Math.ceil(result.total / masterPageSize));

  const load = async (search: string, page: number) => {
    setBusy(true); setMessage('');
    try { setResult(await jobDescriptionsClient.list(search, page, masterPageSize)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Job descriptions could not be loaded.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load('', 1); }, []);
  const openEditor = (item?: JobDescription) => {
    setEditing(item ?? null); setForm(item ? { jdId: item.jdId, roleTitle: item.roleTitle } : { jdId: '', roleTitle: '' }); setMessage(''); editorRef.current?.showModal();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (editing) await jobDescriptionsClient.update(editing.id, form); else await jobDescriptionsClient.create(form);
      editorRef.current?.close(); await load(result.search, editing ? result.page : 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Job description could not be saved.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return; setBusy(true); setMessage('');
    try { await jobDescriptionsClient.delete(deleteTarget.id); deleteRef.current?.close(); setDeleteTarget(null); await load(result.search, 1); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Job description could not be deleted.'); }
    finally { setBusy(false); }
  };
  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.csv$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setMessage(/\.csv$/i.test(file.name) ? 'Choose a CSV smaller than 10 MB.' : 'Choose a CSV file.');
      event.target.value = '';
      return;
    }
    setBusy(true); setMessage('');
    try {
      const summary = await jobDescriptionsClient.importCsv(file);
      await load('', 1);
      setQuery('');
      setMessage(`Imported ${summary.totalRows} mappings: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'JD mappings could not be imported.'); }
    finally { setBusy(false); if (importInputRef.current) importInputRef.current.value = ''; }
  };

  return <section className="data-table-card jd-master" aria-labelledby="jd-master-title">
    <header className="data-table-card__header"><div><h3 className="data-table-card__title" id="jd-master-title">JD master</h3><p className="data-table-card__description">{result.total} role mappings</p></div><div className="data-table-card__actions"><input ref={importInputRef} id="jd-master-import" className="visually-hidden" type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => void importCsv(event)} /><label className="a-button a-button--secondary -small" htmlFor="jd-master-import"><i className="a-icon a-button__icon boschicon-bosch-ic-upload" aria-hidden="true" /><span className="a-button__label">Import CSV</span></label><button className="a-button a-button--secondary -small" type="button" onClick={() => openEditor()}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /><span className="a-button__label">Add JD</span></button></div></header>
    <form className="jd-toolbar" role="search" onSubmit={(event) => { event.preventDefault(); void load(query.trim(), 1); }}><input type="search" value={query} maxLength={200} placeholder="Search JD ID or Role Title" aria-label="Search JD master" onChange={(event) => setQuery(event.target.value)} /><button className="a-button a-button--primary -small" type="submit" disabled={busy} aria-label="Search JD master"><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button></form>
    {message && <p className="jd-message" role="status">{message}</p>}
    <div className="data-table-scroll jd-table"><table className="data-table"><thead><tr className="data-table__column-header"><th>JD ID</th><th>Role Title</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{item.jdId}</td><td>{item.roleTitle}</td><td className="hrbp-table__actions"><button className="a-button a-button--integrated -small" type="button" title="Edit" aria-label={`Edit ${item.jdId}`} onClick={() => openEditor(item)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" title="Delete" aria-label={`Delete ${item.jdId}`} onClick={() => { setDeleteTarget(item); setMessage(''); deleteRef.current?.showModal(); }}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></td></tr>)}</tbody></table></div>
    <footer className="rbin-mapping-table__pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous JD page" disabled={busy || result.page === 1} onClick={() => void load(result.search, result.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {result.page} of {pages}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next JD page" disabled={busy || result.page >= pages} onClick={() => void load(result.search, result.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></footer>
    <dialog className="hrbp-dialog" ref={editorRef}><form onSubmit={save}><header className="hrbp-dialog__header"><h2>{editing ? 'Edit job description' : 'Add job description'}</h2><button className="a-button a-button--integrated" type="button" aria-label="Close" onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="hrbp-dialog__body"><label className="hrbp-field"><span>JD ID</span><input autoFocus required maxLength={100} value={form.jdId} onChange={(event) => setForm((current) => ({ ...current, jdId: event.target.value }))} /></label><label className="hrbp-field"><span>Role Title</span><input required maxLength={200} value={form.roleTitle} onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))} /></label>{message && <p className="hrbp-dialog__error">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={busy}><span className="a-button__label">{busy ? 'Saving...' : 'Save'}</span></button></footer></form></dialog>
    <dialog className="hrbp-dialog hrbp-dialog--confirm" ref={deleteRef}><div className="hrbp-dialog__body"><h2>Delete job description?</h2><p>Delete <strong>{deleteTarget?.jdId}</strong> ({deleteTarget?.roleTitle})? Assigned JDs cannot be deleted.</p>{message && <p className="hrbp-dialog__error">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" onClick={() => deleteRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void remove()}><span className="a-button__label">Delete</span></button></footer></dialog>
  </section>;
}

function ImportPanel() {
  const previewRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EmployeeJdPreview | null>(null);
  const [filter, setFilter] = useState<EmployeeJdPreviewFilter>('all');
  const [editing, setEditing] = useState<EmployeeJdPreviewRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null; setMessage('');
    if (selected && (!/\.xlsx$/i.test(selected.name) || selected.size > 50 * 1024 * 1024)) { setFile(null); setMessage('Choose an XLSX file smaller than 50 MB.'); event.target.value = ''; return; }
    setFile(selected);
  };
  const upload = async () => {
    if (!file) return; setBusy(true); setMessage('');
    try { const next = await employeeJdImportClient.createPreview(file); setPreview(next); setConfirmed(false); previewRef.current?.showModal(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Workbook could not be uploaded.'); }
    finally { setBusy(false); }
  };
  const load = async (nextFilter: EmployeeJdPreviewFilter, page: number) => { if (!preview) return; setBusy(true); try { setPreview(await employeeJdImportClient.getRows(preview.id, nextFilter, page, 25)); setFilter(nextFilter); } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview could not be loaded.'); } finally { setBusy(false); } };
  const saveRow = async () => { if (!preview || !editing) return; setBusy(true); try { setPreview(await employeeJdImportClient.updateRow(preview.id, editing, filter, preview.page)); setEditing(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'Row could not be updated.'); } finally { setBusy(false); } };
    const deleteRow = async (row: EmployeeJdPreviewRow) => { if (!preview) return; setBusy(true); setMessage(''); const remainingFilteredRows = Math.max(0, preview.filteredRows - 1); const targetPage = Math.min(preview.page, Math.max(1, Math.ceil(remainingFilteredRows / 25))); try { setPreview(await employeeJdImportClient.deleteRow(preview.id, row.rowNumber, filter, targetPage)); if (editing?.rowNumber === row.rowNumber) setEditing(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'Row could not be deleted.'); } finally { setBusy(false); } };
  const cancel = async () => { if (!preview) return; setBusy(true); try { await employeeJdImportClient.cancel(preview.id); previewRef.current?.close(); setPreview(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview could not be cancelled.'); } finally { setBusy(false); } };
  const commit = async () => { if (!preview) return; setBusy(true); try { const result = await employeeJdImportClient.commit(preview.id, confirmed); previewRef.current?.close(); setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ''; setMessage(`Replaced ${result.totalRows} employee JD records and recorded ${result.movements} movements.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Assignments could not be replaced.'); } finally { setBusy(false); } };
  const pageCount = Math.max(1, Math.ceil((preview?.filteredRows ?? 0) / 25));
  const warningRows = preview?.warningRows ?? 0;
  const previewNeedsUpdatedApi = preview !== null && preview.warningRows === undefined;

  return <section className="namelist-panel jd-import" aria-labelledby="jd-import-title"><div className="namelist-panel__header"><div><p className="namelist-panel__eyebrow">Current assignment snapshot</p><h2 id="jd-import-title">Employee JD upload</h2><p>Validate Pers.No. and JDID before replacing all current assignments. Blank JD IDs are saved without an assignment after confirmation.</p></div></div><div className="namelist-panel__body"><div className="namelist-upload"><i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" /><div><strong>Select employee JD workbook</strong><p>XLSX · 50 MB maximum · 25,000 rows</p></div><input ref={inputRef} id="employee-jd-file" className="visually-hidden" type="file" accept=".xlsx" onChange={selectFile} /><label className="a-button a-button--secondary" htmlFor="employee-jd-file"><span className="a-button__label">Choose file</span></label></div>{file && <div className="namelist-file"><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><span><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void upload()}><span className="a-button__label">{busy ? 'Preparing...' : 'Upload and preview'}</span></button></div>}{message && <p className="namelist-panel__message" role="status">{message}</p>}</div>
    <dialog className="namelist-dialog" ref={previewRef}>
      {preview && <div className="namelist-dialog__layout">
        <header className="namelist-dialog__header">
          <div><span>Employee JD preview</span><h2>{preview.fileName}</h2><p>{preview.totalRows} employee rows</p></div>
          <button className="a-button a-button--integrated" type="button" aria-label="Close" onClick={() => previewRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
        </header>
        <div className="namelist-summary jd-preview-summary"><div><span>Total</span><strong>{preview.totalRows}</strong></div><div><span>Valid</span><strong>{preview.validRows - warningRows}</strong></div><div className={warningRows ? 'is-warning' : ''}><span>Warnings</span><strong>{warningRows}</strong></div><div className={preview.invalidRows ? 'is-error' : ''}><span>Invalid</span><strong>{preview.invalidRows}</strong></div><p>{previewNeedsUpdatedApi ? 'Restart the API and upload a fresh preview to see JD warnings.' : preview.invalidRows ? 'Correct invalid rows before replacing assignments.' : warningRows ? 'Blank JD IDs will be saved without an assignment after confirmation.' : 'All rows passed validation.'}</p></div>
        {message && <p className="namelist-dialog__message">{message}</p>}
        <div className="namelist-toolbar"><div className="namelist-segments">{(['all', 'valid', 'warning', 'invalid'] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => void load(value, 1)}>{value}</button>)}</div><span>{preview.filteredRows} rows</span></div>
        <div className="namelist-grid jd-preview-grid"><table><thead><tr><th>Row</th><th>Status</th><th>Pers.No.</th><th>JD ID</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>
          {preview.rows.map((row) => <tr key={row.rowNumber} className={row.issues.some((issue) => issue.severity !== 'warning') ? 'is-invalid' : row.issues.length ? 'is-warning' : ''}>
            <td>{row.rowNumber}</td>
            <td><span className={`namelist-status ${row.issues.some((issue) => issue.severity !== 'warning') ? 'is-invalid' : row.issues.length ? 'is-warning' : 'is-valid'}`}>{row.issues.some((issue) => issue.severity !== 'warning') ? `${row.issues.length} issues` : row.issues.length ? 'Warning' : 'Valid'}</span></td>
            <td title={row.issues.find((issue) => issue.column === 'pers_no')?.message}>{row.values.pers_no}</td>
            <td title={row.issues.find((issue) => issue.column === 'jd_id')?.message}>{row.values.jd_id || (row.issues.some((issue) => issue.severity === 'warning') ? 'No JD ID' : '')}</td>
            <td>
              <button className="a-button a-button--integrated -small" type="button" aria-label={`Edit row ${row.rowNumber}`} disabled={busy} onClick={() => setEditing(structuredClone(row))}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>
              <button className="a-button a-button--integrated -small" type="button" title="Delete row" aria-label={`Delete row ${row.rowNumber}`} disabled={busy} onClick={() => void deleteRow(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
            </td>
          </tr>)}
        </tbody></table></div>
        <div className="namelist-pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous page" disabled={preview.page === 1} onClick={() => void load(filter, preview.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {preview.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next page" disabled={preview.page >= pageCount} onClick={() => void load(filter, preview.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div>
        {editing && <aside className="namelist-editor"><div className="namelist-editor__header"><h3>Edit row {editing.rowNumber}</h3><button className="a-button a-button--integrated" type="button" aria-label="Close editor" onClick={() => setEditing(null)}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div><div className="namelist-editor__fields"><label className="hrbp-field"><span>Pers.No.</span><input value={editing.values.pers_no} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, pers_no: event.target.value } } : null)} /></label><label className="hrbp-field"><span>JD ID</span><input value={editing.values.jd_id} onChange={(event) => setEditing((current) => current ? { ...current, values: { ...current.values, jd_id: event.target.value } } : null)} /></label>{editing.issues.map((issue) => <p className={issue.severity === 'warning' ? 'jd-warning' : 'hrbp-dialog__error'} key={`${issue.column}-${issue.message}`}>{issue.message}</p>)}</div><div className="namelist-editor__footer"><button className="a-button a-button--secondary" type="button" onClick={() => setEditing(null)}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" onClick={() => void saveRow()}><span className="a-button__label">Validate row</span></button></div></aside>}
        <footer className="namelist-dialog__footer"><label className="namelist-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this deletes and replaces every current employee JD assignment.</span></label><div><button className="a-button a-button--secondary" type="button" onClick={() => void cancel()}><span className="a-button__label">Cancel preview</span></button><button className="a-button a-button--primary" type="button" disabled={busy || previewNeedsUpdatedApi || preview.invalidRows > 0 || !confirmed} onClick={() => void commit()}><span className="a-button__label">Replace assignments</span></button></div></footer>
      </div>}
    </dialog>
  </section>;
}

export function JdManagementPanel() {
  return <section className="jd-management" aria-labelledby="jd-management-title"><header className="hrbp-page__heading"><div><p className="hrbp-section__eyebrow">Job architecture</p><h2 id="jd-management-title">Job description management</h2><p>Maintain role definitions and replace employee assignments.</p></div></header><div className="jd-management__workspace"><MasterPanel /><ImportPanel /></div></section>;
}
