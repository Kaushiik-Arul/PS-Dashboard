"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RbinException, RbinExceptionColumnOption, RbinExceptionPage, RbinExceptionRuleInput, RbinExceptionsClient } from "./rbin-exceptions.types";

const pageSize = 8;
const emptyPage: RbinExceptionPage = { items: [], total: 0, page: 1, pageSize, search: "", filter: "", columns: [] };
type DraftRule = { columnName: string; fixedValue: string };

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function valueType(column: string) {
  if (["birth_date", "joining_date", "entry_for_retirement", "technical_entry_date"].includes(column)) return "date";
  if (column === "official_email") return "email";
  return "text";
}

export function RbinExceptionsPanel({ client }: { client: RbinExceptionsClient }) {
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState(emptyPage);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [persNo, setPersNo] = useState("");
  const [rules, setRules] = useState<DraftRule[]>([{ columnName: "", fixedValue: "" }]);
  const [editing, setEditing] = useState<RbinException | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RbinException | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const pageCount = Math.max(1, Math.ceil(result.total / pageSize));

  const load = async (search: string, filter: string, page: number) => {
    setBusy(true); setMessage("");
    try { setResult(await client.list(search, filter, page, pageSize)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Employee exceptions could not be loaded."); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load("", "", 1); }, [client]);

  const openCreate = () => {
    setEditing(null); setPersNo(""); setRules([{ columnName: "", fixedValue: "" }]); setMessage("");
    editorRef.current?.showModal();
  };
  const openEdit = (row: RbinException) => {
    setEditing(row); setPersNo(row.persNo); setRules([{ columnName: row.columnName, fixedValue: row.fixedValue }]); setMessage("");
    editorRef.current?.showModal();
  };
  const updateRule = (index: number, patch: Partial<DraftRule>) => setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  const availableColumns = (index: number) => {
    const selected = new Set(rules.filter((_, ruleIndex) => ruleIndex !== index).map((rule) => rule.columnName));
    return result.columns.filter((column) => !selected.has(column.key));
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const normalized = rules.map((rule) => ({ columnName: rule.columnName, fixedValue: rule.fixedValue.trim() }));
      if (editing) await client.update(editing.id, { persNo: persNo.trim(), ...normalized[0] });
      else await client.create(persNo.trim(), normalized as RbinExceptionRuleInput[]);
      editorRef.current?.close();
      await load(result.search, result.filter, editing ? result.page : 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Employee exception could not be saved."); }
    finally { setBusy(false); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true); setMessage("");
    try {
      await client.delete(deleteTarget.id); deleteRef.current?.close(); setDeleteTarget(null);
      const nextTotal = Math.max(0, result.total - 1);
      await load(result.search, result.filter, Math.min(result.page, Math.max(1, Math.ceil(nextTotal / pageSize))));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Employee exception could not be deleted."); }
    finally { setBusy(false); }
  };

  return <section className="rbin-exceptions-panel" aria-labelledby="rbin-exceptions-title">
    <header className="hrbp-page__heading"><div><p className="hrbp-section__eyebrow">Transformation exceptions</p><h2 id="rbin-exceptions-title">Employee exceptions</h2><p>Set fixed Namelist values for individual employees in future RBIN uploads.</p></div><button className="a-button a-button--primary" type="button" disabled={busy || result.columns.length === 0} onClick={openCreate}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /><span className="a-button__label">Add employee exception</span></button></header>
    <section className="data-table-card rbin-exceptions-table" aria-label="Employee exception records">
      <div className="data-table-card__header"><div><h3 className="data-table-card__title">Current exceptions</h3><p className="data-table-card__description">{result.total} fixed column {result.total === 1 ? "value" : "values"}</p></div><div className="data-table-card__actions"><label className="rbin-exceptions-table__filter"><span className="visually-hidden">Filter by Namelist column</span><select value={result.filter} disabled={busy} aria-label="Filter exceptions by Namelist column" onChange={(event) => void load(result.search, event.target.value, 1)}><option value="">All columns</option>{result.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label><button className="a-button a-button--integrated -small" type="button" aria-label={`${searchOpen ? "Close" : "Open"} employee exception search`} aria-expanded={searchOpen} aria-controls="rbin-exceptions-search" onClick={() => { if (searchOpen) { setSearchInput(""); if (result.search) void load("", result.filter, 1); } setSearchOpen((open) => !open); }}><i className={`a-icon a-button__icon ${searchOpen ? "boschicon-bosch-ic-close" : "boschicon-bosch-ic-search"}`} aria-hidden="true" /></button></div></div>
      <form id="rbin-exceptions-search" className="rbin-exceptions-table__search" hidden={!searchOpen} role="search" onSubmit={(event) => { event.preventDefault(); void load(searchInput.trim(), result.filter, 1); }}><input type="search" maxLength={100} value={searchInput} placeholder="Search Pers.No, column, or fixed value" aria-label="Search employee exceptions" onChange={(event) => setSearchInput(event.target.value)} /><button className="a-button a-button--primary -small" type="submit" disabled={busy} aria-label="Search employee exceptions"><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button></form>
      {message && <p className="rbin-exceptions-table__message" role="status">{message}</p>}
      <div className="data-table-scroll"><table className="data-table rbin-exceptions-table__grid"><thead><tr className="data-table__column-header"><th scope="col">Pers.No</th><th scope="col">Namelist column</th><th scope="col">Fixed value</th><th scope="col">Updated at</th><th scope="col">Updated by</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{result.items.length ? result.items.map((row) => <tr key={row.id}><td>{row.persNo}</td><td>{row.columnLabel}</td><td>{row.fixedValue}</td><td>{formatTimestamp(row.updatedAt)}</td><td>{row.updatedBy}</td><td className="hrbp-table__actions"><button className="a-button a-button--integrated -small" type="button" disabled={busy} title="Edit exception" aria-label={`Edit ${row.columnLabel} exception for ${row.persNo}`} onClick={() => openEdit(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" disabled={busy} title="Delete exception" aria-label={`Delete ${row.columnLabel} exception for ${row.persNo}`} onClick={() => { setDeleteTarget(row); setMessage(""); deleteRef.current?.showModal(); }}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></td></tr>) : <tr><td className="hrbp-table__empty" colSpan={6}>{busy ? "Loading exceptions..." : "No employee exceptions found."}</td></tr>}</tbody></table></div>
      <footer className="rbin-mapping-table__pagination"><button className="a-button a-button--integrated -small" type="button" aria-label="Previous exception page" disabled={busy || result.page === 1} onClick={() => void load(result.search, result.filter, result.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {result.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next exception page" disabled={busy || result.page >= pageCount} onClick={() => void load(result.search, result.filter, result.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></footer>
    </section>

    <dialog className="hrbp-dialog rbin-exception-dialog" ref={editorRef} onClose={() => setEditing(null)}><form onSubmit={save}><header className="hrbp-dialog__header"><div><span>{editing ? "Edit exception" : "New exceptions"}</span><h2>{editing ? "Fixed employee value" : "Employee fixed values"}</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close exception editor" disabled={busy} onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="hrbp-dialog__body"><label className="hrbp-field"><span>Pers.No</span><input autoFocus inputMode="numeric" required value={persNo} disabled={busy} onChange={(event) => setPersNo(event.target.value.trim())} /></label><div className="rbin-exception-rules"><div className="rbin-exception-rules__heading"><strong>Fixed columns</strong>{!editing && rules.length < result.columns.length && <button className="a-button a-button--secondary -small" type="button" disabled={busy} onClick={() => setRules((current) => [...current, { columnName: "", fixedValue: "" }])}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /><span className="a-button__label">Add column</span></button>}</div>{rules.map((rule, index) => <div className="rbin-exception-rule" key={index}><label className="hrbp-field"><span>Namelist column</span><select required value={rule.columnName} disabled={busy} onChange={(event) => updateRule(index, { columnName: event.target.value, fixedValue: "" })}><option value="">Select column</option>{availableColumns(index).map((column: RbinExceptionColumnOption) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label><label className="hrbp-field"><span>Fixed value</span><input required type={valueType(rule.columnName)} value={rule.fixedValue} maxLength={500} disabled={busy} onChange={(event) => updateRule(index, { fixedValue: event.target.value })} /></label>{!editing && rules.length > 1 && <button className="a-button a-button--integrated -small rbin-exception-rule__remove" type="button" disabled={busy} title="Remove column" aria-label={`Remove fixed column ${index + 1}`} onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>}</div>)}</div><p>These values apply to future RBIN uploads. Manual edits in a staged batch can override them.</p>{message && <p className="hrbp-dialog__error" role="alert">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={busy}><span className="a-button__label">{busy ? "Saving..." : editing ? "Save exception" : "Add exceptions"}</span></button></footer></form></dialog>
    <dialog className="hrbp-dialog rbin-mapping-dialog" ref={deleteRef} onClose={() => setDeleteTarget(null)}><div><header className="hrbp-dialog__header"><div><span>Delete exception</span><h2>Remove fixed value?</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close delete confirmation" disabled={busy} onClick={() => deleteRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="hrbp-dialog__body"><p>Remove the <strong>{deleteTarget?.columnLabel}</strong> exception for Pers.No <strong>{deleteTarget?.persNo}</strong>?</p><p>This affects future RBIN uploads only.</p>{message && <p className="hrbp-dialog__error" role="alert">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => deleteRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void confirmDelete()}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /><span className="a-button__label">{busy ? "Deleting..." : "Delete exception"}</span></button></footer></div></dialog>
  </section>;
}