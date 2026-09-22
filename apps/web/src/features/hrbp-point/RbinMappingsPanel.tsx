"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  RbinMapping,
  RbinMappingInput,
  RbinMappingKind,
  RbinMappingPage,
  RbinMappingsClient,
} from "./rbin-mappings.types";

const pageSize = 8;

type MappingTableProps = {
  kind: RbinMappingKind;
  client: RbinMappingsClient;
};

const emptyPage: RbinMappingPage = { items: [], total: 0, page: 1, pageSize, search: "", filter: "", filterOptions: [] };
const emptyInput: RbinMappingInput = { organizationalUnit: "", value: "" };

function MappingTable({ kind, client }: MappingTableProps) {
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<RbinMappingPage>(emptyPage);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [editing, setEditing] = useState<RbinMapping | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RbinMapping | null>(null);
  const [form, setForm] = useState<RbinMappingInput>(emptyInput);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const valueLabel = kind === "ranges" ? "Range" : "Function";
  const title = `${valueLabel} mappings`;
  const pageCount = Math.max(1, Math.ceil(result.total / pageSize));

  const load = async (search: string, filter: string, page: number) => {
    setBusy(true);
    setMessage("");
    try {
      setResult(await client.list(kind, search, filter, page, pageSize));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${title} could not be loaded.`);
    } finally { setBusy(false); }
  };

  useEffect(() => { void load("", "", 1); }, [client, kind]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(searchInput.trim(), result.filter, 1);
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchInput("");
      if (result.search) void load("", result.filter, 1);
    }
    setSearchOpen((open) => !open);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyInput);
    setMessage("");
    editorRef.current?.showModal();
  };

  const openEdit = (mapping: RbinMapping) => {
    setEditing(mapping);
    setForm({ organizationalUnit: mapping.organizationalUnit, value: mapping.value });
    setMessage("");
    editorRef.current?.showModal();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { organizationalUnit: form.organizationalUnit.trim(), value: form.value.trim() };
    if (!input.organizationalUnit || !input.value) {
      setMessage(`Organizational Unit and ${valueLabel} are required.`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (editing) await client.update(kind, editing.id, input);
      else await client.create(kind, input);
      editorRef.current?.close();
      await load(result.search, result.filter, editing ? result.page : 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${valueLabel} mapping could not be saved.`);
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setMessage("");
    try {
      await client.delete(kind, deleteTarget.id);
      deleteRef.current?.close();
      setDeleteTarget(null);
      const nextTotal = Math.max(0, result.total - 1);
      const nextPage = Math.min(result.page, Math.max(1, Math.ceil(nextTotal / pageSize)));
      await load(result.search, result.filter, nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${valueLabel} mapping could not be deleted.`);
    } finally { setBusy(false); }
  };

  return <section className="data-table-card rbin-mapping-table" aria-labelledby={`rbin-${kind}-title`}>
    <header className="data-table-card__header rbin-mapping-table__header">
      <div><h3 className="data-table-card__title" id={`rbin-${kind}-title`}>{title}</h3><p className="data-table-card__description">{result.total} mappings</p></div>
      <div className="data-table-card__actions">
        <label className="rbin-mapping-table__filter"><span className="visually-hidden">Filter {title}</span><select value={result.filter} disabled={busy} aria-label={`Filter ${title} by ${valueLabel}`} onChange={(event) => void load(result.search, event.target.value, 1)}><option value="">All {kind}</option>{result.filterOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <button className="a-button a-button--integrated -small" type="button" aria-label={`${searchOpen ? "Close" : "Open"} ${title} search`} aria-expanded={searchOpen} aria-controls={`rbin-${kind}-search`} onClick={toggleSearch}><i className={`a-icon a-button__icon ${searchOpen ? "boschicon-bosch-ic-close" : "boschicon-bosch-ic-search"}`} aria-hidden="true" /></button>
        <button className="a-button a-button--secondary -small" type="button" disabled={busy} onClick={openCreate}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /><span className="a-button__label">Add</span></button>
      </div>
    </header>
    <form id={`rbin-${kind}-search`} className="rbin-mapping-table__search" hidden={!searchOpen} role="search" onSubmit={submitSearch}>
      <input type="search" value={searchInput} maxLength={100} placeholder={`Search Organizational Unit or ${valueLabel}`} aria-label={`Search ${title}`} onChange={(event) => setSearchInput(event.target.value)} />
      <button className="a-button a-button--primary -small" type="submit" disabled={busy} aria-label={`Search ${title}`}><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button>
    </form>
    {message && <p className="rbin-mapping-table__message" role="status">{message}</p>}
    <div className="data-table-scroll rbin-mapping-table__scroll">
      <table className="data-table"><thead><tr className="data-table__column-header"><th scope="col">Organizational Unit</th><th scope="col">{valueLabel}</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
        <tbody>{result.items.map((mapping) => <tr key={mapping.id}><td>{mapping.organizationalUnit}</td><td>{mapping.value}</td><td className="hrbp-table__actions"><button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Edit ${mapping.organizationalUnit}`} title="Edit mapping" onClick={() => openEdit(mapping)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" disabled={busy} aria-label={`Delete ${mapping.organizationalUnit}`} title="Delete mapping" onClick={() => { setDeleteTarget(mapping); setMessage(""); deleteRef.current?.showModal(); }}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></td></tr>)}</tbody>
      </table>
      {!busy && result.items.length === 0 && <p className="rbin-mapping-table__empty">No matching mappings.</p>}
    </div>
    <footer className="rbin-mapping-table__pagination"><button className="a-button a-button--integrated -small" type="button" aria-label={`Previous ${title} page`} disabled={busy || result.page === 1} onClick={() => void load(result.search, result.filter, result.page - 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {result.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label={`Next ${title} page`} disabled={busy || result.page >= pageCount} onClick={() => void load(result.search, result.filter, result.page + 1)}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></footer>

    <dialog className="hrbp-dialog rbin-mapping-dialog" ref={editorRef} onClose={() => setEditing(null)}><form onSubmit={save}><header className="hrbp-dialog__header"><div><span>{editing ? "Edit mapping" : "New mapping"}</span><h2>{valueLabel} mapping</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close mapping editor" disabled={busy} onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="hrbp-dialog__body"><label className="hrbp-field"><span>Organizational Unit</span><input autoFocus value={form.organizationalUnit} maxLength={200} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, organizationalUnit: event.target.value }))} /></label><label className="hrbp-field"><span>{valueLabel}</span><input value={form.value} maxLength={200} disabled={busy} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></label>{message && <p className="hrbp-dialog__error" role="alert">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={busy}><span className="a-button__label">{busy ? "Saving..." : "Save mapping"}</span></button></footer></form></dialog>

    <dialog className="hrbp-dialog rbin-mapping-dialog" ref={deleteRef} onClose={() => setDeleteTarget(null)}><div><header className="hrbp-dialog__header"><div><span>Delete mapping</span><h2>Remove {valueLabel}</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close delete confirmation" disabled={busy} onClick={() => deleteRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="hrbp-dialog__body"><p>Remove the {valueLabel} mapping for <strong>{deleteTarget?.organizationalUnit}</strong>?</p><p>This affects future RBIN uploads only.</p>{message && <p className="hrbp-dialog__error" role="alert">{message}</p>}</div><footer className="hrbp-dialog__footer"><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => deleteRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void confirmDelete()}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /><span className="a-button__label">{busy ? "Deleting..." : "Delete mapping"}</span></button></footer></div></dialog>
  </section>;
}

export function RbinMappingsPanel({ client }: { client: RbinMappingsClient }) {
  return <section className="rbin-mappings-panel" aria-labelledby="rbin-mappings-title">
    <header className="hrbp-page__heading"><div><p className="hrbp-section__eyebrow">Transformation configuration</p><h2 id="rbin-mappings-title">Organizational Unit mappings</h2><p>Maintain mappings used by future RBIN uploads.</p></div></header>
    <div className="rbin-mappings-panel__tables"><MappingTable kind="ranges" client={client} /><MappingTable kind="functions" client={client} /></div>
  </section>;
}