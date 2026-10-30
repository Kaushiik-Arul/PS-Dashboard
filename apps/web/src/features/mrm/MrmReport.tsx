"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/auth/csrf";
import type { MrmColumn, MrmColumnType, MrmMonth, MrmReportDocument, MrmRow, MrmSavePayload } from "./mrm.types";
import "./mrm.css";

type Status = "" | "green" | "amber" | "red";
const statuses: Status[] = ["", "green", "amber", "red"];
const tableDefinitions = [
  { key: "ps-corp", title: "PS Corp Performance Dashboard" },
  { key: "ps-in", title: "PS-IN Performance Dashboard" },
] as const;

function moveItem<T>(items: T[], index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function htmlValue(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cellText(row: MrmRow, column: MrmColumn) {
  const value = String(row.cells[column.key] ?? "");
  if (column.type === "status") return value ? value[0].toUpperCase() + value.slice(1) : "";
  return value;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function reportTables(rows: MrmRow[]) {
  return tableDefinitions.map((definition) => ({
    ...definition,
    rows: rows.filter((row) => row.tableKey === definition.key),
  })).filter((table) => table.rows.length > 0);
}

type MrmReportProps = { initialReport: MrmReportDocument; months: MrmMonth[] };

function savePayload(source: MrmReportDocument): MrmSavePayload {
  return {
    expectedRevision: source.revision,
    columns: source.columns.map(({ key, label, type, managed }) => ({ key, label, type, managed })),
    rows: source.rows.map(({ mode, calculationKey: _calculationKey, ...row }) => ({
      ...row,
      cells: mode === "manual" ? row.cells : {},
    })),
  };
}

export function MrmReport({ initialReport, months }: MrmReportProps) {
  const router = useRouter();
  const [document, setDocument] = useState(initialReport);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [newColumnType, setNewColumnType] = useState<MrmColumnType>("value");
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving" | "error" | "conflict">("saved");
  const canEdit = document.canManage && document.status === "draft";

  useEffect(() => {
    window.localStorage.removeItem("ps-dashboard:mrm-prototype:v1");
  }, []);

  const saveNow = useCallback(async (source: MrmReportDocument): Promise<MrmReportDocument | null> => {
    if (!source.canManage || source.status !== "draft" || saveState === "conflict") return source;
    setSaveState("saving");
    const csrf = getCsrfToken();
    try {
      const response = await fetch(`/api/mrm/reports/${encodeURIComponent(source.reportingMonth)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
        body: JSON.stringify(savePayload(source)),
      });
      if (response.status === 409) {
        setSaveState("conflict");
        setMessage("This report changed elsewhere. Your unsaved work is preserved; reload before saving again.");
        return null;
      }
      if (!response.ok) throw new Error();
      const saved = await response.json() as MrmReportDocument;
      setDocument((current) => ({
        ...current,
        revision: saved.revision,
        updatedAt: saved.updatedAt,
        sourceStatus: saved.sourceStatus,
      }));
      setSaveState((current) => current === "saving" ? "saved" : current);
      return saved;
    } catch {
      setSaveState("error");
      setMessage("The report could not be saved.");
      return null;
    }
  }, [saveState]);

  useEffect(() => {
    if (saveState !== "unsaved") return;
    const timer = window.setTimeout(() => void saveNow(document), 900);
    return () => window.clearTimeout(timer);
  }, [document, saveNow, saveState]);

  const mutateDocument = (update: (current: MrmReportDocument) => MrmReportDocument) => {
    if (!canEdit || saveState === "conflict") return;
    setDocument((current) => update(current));
    setSaveState("unsaved");
  };

  const updateRow = (rowId: string, changes: Partial<MrmRow>) => {
    mutateDocument((current) => ({
      ...current,
      rows: current.rows.map((row) => row.key === rowId ? { ...row, ...changes } : row),
    }));
  };

  const updateCell = (rowId: string, columnId: string, value: string) => {
    mutateDocument((current) => ({
      ...current,
      rows: current.rows.map((row) => row.key === rowId
        ? { ...row, cells: { ...row.cells, [columnId]: value } }
        : row),
    }));
  };

  const changeReportingMonth = (reportingMonth: string) => {
    if (!reportingMonth) return;
    router.push(`/mrm?month=${encodeURIComponent(reportingMonth)}`);
  };

  const addColumn = () => {
    const key = newId("column");
    const column: MrmColumn = { id: key, key, label: "New column", type: newColumnType, managed: false };
    mutateDocument((current) => {
      const attachmentIndex = current.columns.findIndex((item) => item.type === "attachment");
      const columns = [...current.columns];
      columns.splice(attachmentIndex < 0 ? columns.length : attachmentIndex, 0, column);
      return { ...current, columns };
    });
    setMessage("Column added. Rename it in the table header.");
  };

  const addRow = (tableKey: string) => {
    const key = newId("row");
    mutateDocument((current) => ({
      ...current,
      rows: [...current.rows, { key, tableKey, calculationKey: null, title: "New KPI", description: "", mode: "manual", highlighted: false, muted: false, emphasized: true, managed: false, cells: {} }],
    }));
    setMessage("KPI row added.");
  };

  const moveRow = (rowId: string, offset: -1 | 1) => {
    mutateDocument((current) => {
      const sourceIndex = current.rows.findIndex((row) => row.key === rowId);
      if (sourceIndex < 0) return current;
      const tableIndexes = current.rows
        .map((row, index) => row.tableKey === current.rows[sourceIndex].tableKey ? index : -1)
        .filter((index) => index >= 0);
      const tableIndex = tableIndexes.indexOf(sourceIndex);
      const targetIndex = tableIndexes[tableIndex + offset];
      if (targetIndex === undefined) return current;
      const rows = [...current.rows];
      [rows[sourceIndex], rows[targetIndex]] = [rows[targetIndex], rows[sourceIndex]];
      return { ...current, rows };
    });
  };

  const cycleStatus = (row: MrmRow, column: MrmColumn) => {
    const current = (row.cells[column.key] ?? "") as Status;
    updateCell(row.key, column.key, statuses[(statuses.indexOf(current) + 1) % statuses.length]);
  };

  const chooseAttachment = async (rowId: string, columnId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const saved = saveState === "saved" ? document : await saveNow(document);
    if (!saved) return;
    const form = new FormData();
    form.set("rowKey", rowId); form.set("columnKey", columnId); form.set("file", file);
    const csrf = getCsrfToken();
    const response = await fetch(`/api/mrm/reports/${encodeURIComponent(saved.reportingMonth)}/attachments`, {
      method: "POST", headers: csrf ? { "X-CSRF-Token": csrf } : {}, body: form,
    });
    if (!response.ok) { setMessage("The attachment could not be uploaded."); return; }
    setDocument(await response.json() as MrmReportDocument);
    setMessage("Attachment uploaded.");
  };

  const deleteAttachment = async (attachmentId: string) => {
    const csrf = getCsrfToken();
    const response = await fetch(`/api/mrm/reports/${encodeURIComponent(document.reportingMonth)}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: "DELETE", headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
    if (!response.ok) { setMessage("The attachment could not be deleted."); return; }
    setDocument((current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== attachmentId) }));
    setMessage("Attachment deleted.");
  };

  const finalizeReport = async () => {
    if (!window.confirm(`Finalize ${document.reportingMonth}? Finalized reports cannot be changed.`)) return;
    const saved = saveState === "saved" ? document : await saveNow(document);
    if (!saved) return;
    const csrf = getCsrfToken();
    const response = await fetch(`/api/mrm/reports/${encodeURIComponent(saved.reportingMonth)}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
      body: JSON.stringify({ expectedRevision: saved.revision }),
    });
    if (!response.ok) { setMessage("The report could not be finalized."); return; }
    const finalized = await response.json() as MrmReportDocument;
    setDocument(finalized);
    setIsEditingLayout(false);
    setSaveState("saved");
    setMessage("Report finalized.");
  };

  const reportMatrix = () => reportTables(document.rows).flatMap((table, tableIndex) => [
    ...(tableIndex > 0 ? [[""]] : []),
    [table.title],
    ["KPI", ...document.columns.map((column) => column.label.replaceAll("\n", " "))],
    ...table.rows.map((row) => [
      row.description ? `${row.title} (${row.description})` : row.title,
      ...document.columns.map((column) => cellText(row, column)),
    ]),
  ]);

  const reportHtml = () => {
    const headers = ["KPI", ...document.columns.map((column) => column.label)]
      .map((label, index) => `<th style="background:#ffffff;border:1px solid #008ecf;border-bottom:2px solid #252525;font-size:16px;font-weight:700;height:58px;padding:6px;text-align:center;vertical-align:middle;white-space:normal;width:${index === 0 ? "250px" : "145px"}">${htmlValue(label).replaceAll("\n", "<br>")}</th>`)
      .join("");
    return reportTables(document.rows).map((table) => {
      const rows = table.rows.map((row) => {
        const background = row.highlighted ? "#bfe5f7" : row.muted ? "#c9c9c9" : "#ffffff";
        const title = htmlValue(row.title);
        const kpi = `${row.emphasized === false ? title : `<strong>${title}</strong>`}${row.description ? `<br><small>${htmlValue(row.description)}</small>` : ""}`;
        const cells = document.columns.map((column) => {
          const value = cellText(row, column);
          const statusSymbols: Record<string, string> = { Green: "🟢", Amber: "🟠", Red: "🔴" };
          const content = column.type === "status" && statusSymbols[value]
            ? `<span style="font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-size:20px">${statusSymbols[value]}</span>`
            : htmlValue(value);
          return `<td style="background:${background};border:1px solid #252525;font-size:15px;height:42px;mso-number-format:'\\@';padding:6px;text-align:center;vertical-align:middle;white-space:normal">${content}</td>`;
        }).join("");
        return `<tr><th style="background:${background};border:1px solid #252525;font-size:15px;height:42px;padding:6px;text-align:center;vertical-align:middle;white-space:normal;width:250px">${kpi}</th>${cells}</tr>`;
      }).join("");
      return `<h2 style="color:#008ecf;font-family:Arial,sans-serif;font-size:22px;margin:18px 0 6px">${htmlValue(table.title)}</h2><table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial,sans-serif;table-layout:fixed;width:${250 + (document.columns.length * 145)}px"><colgroup><col style="width:250px">${document.columns.map(() => '<col style="width:145px">').join("")}</colgroup><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }).join("");
  };

  const copyReport = async () => {
    try {
      const plainText = reportMatrix().map((row) => row.join("\t")).join("\n");
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([reportHtml()], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        })]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setMessage("Tables copied. Paste them into Excel or PowerPoint.");
    } catch {
      setMessage("The browser blocked clipboard access.");
    }
  };

  const exportExcel = () => {
    const workbook = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><meta name="ExcelWorkbook" content="MRM"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>MRM</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${reportHtml()}</body></html>`;
    const url = URL.createObjectURL(new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `MRM-${document.reportingMonth}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Formatted Excel tables exported.");
  };

  return (
    <main className="mrm-page">
      <header className="mrm-header">
        <div>
          <p className="mrm-header__eyebrow">Monthly reporting</p>
          <h1>Management Review Meeting</h1>
          <p className="mrm-header__description">Prepare the PS Corp and PS-IN KPI tables, complete manual values, and share them with the monthly review.</p>
        </div>
        <div className="mrm-header__actions">
          <button className="a-button a-button--secondary -small" type="button" onClick={() => void copyReport()}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-copy" aria-hidden="true" />
            <span className="a-button__label">Copy tables</span>
          </button>
          <button className="a-button a-button--secondary -small" type="button" onClick={exportExcel}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-download" aria-hidden="true" />
            <span className="a-button__label">Export Excel</span>
          </button>
          {canEdit && <button className={`a-button ${isEditingLayout ? "a-button--primary" : "a-button--secondary"} -small`} type="button" onClick={() => setIsEditingLayout((editing) => !editing)}>
            <i className={`a-icon a-button__icon ${isEditingLayout ? "boschicon-bosch-ic-checkmark" : "boschicon-bosch-ic-edit"}`} aria-hidden="true" />
            <span className="a-button__label">{isEditingLayout ? "Done" : "Edit layout"}</span>
          </button>}
        </div>
      </header>

      <section className="mrm-toolbar" aria-label="MRM report settings">
        <label className="mrm-field" htmlFor="mrm-reporting-month">
          <span>Reporting month</span>
          <select id="mrm-reporting-month" value={document.reportingMonth} onChange={(event) => changeReportingMonth(event.target.value)}>
            {months.map((month) => <option key={month.reportingMonth} value={month.reportingMonth}>{month.reportingMonth} · {month.status}</option>)}
          </select>
        </label>
        <span className={`mrm-source-state ${document.sourceStatus.available ? "is-available" : "is-unavailable"}`}>
          Data month {document.dataMonth}: {document.sourceStatus.available ? document.sourceStatus.source : "unavailable"}
        </span>
        <div className="mrm-toolbar__legend" aria-label="Status legend">
          <span><i className="mrm-status-dot is-green" />On track</span>
          <span><i className="mrm-status-dot is-amber" />Attention</span>
          <span><i className="mrm-status-dot is-red" />Off track</span>
        </div>
        <div className="mrm-persistence-actions">
          <span className={`mrm-toolbar__save-state is-${saveState}`}><i className="a-icon boschicon-bosch-ic-save" aria-hidden="true" /> {saveState === "saved" ? "Saved" : saveState === "unsaved" ? "Unsaved changes" : saveState === "saving" ? "Saving" : saveState === "conflict" ? "Save conflict" : "Save failed"}</span>
          {canEdit && <button className="a-button a-button--secondary -small" type="button" disabled={saveState === "saving" || saveState === "conflict"} onClick={() => void saveNow(document)}><span className="a-button__label">Save now</span></button>}
          {canEdit && <button className="a-button a-button--primary -small" type="button" disabled={!document.sourceStatus.available || saveState === "saving" || saveState === "conflict"} onClick={() => void finalizeReport()}><span className="a-button__label">Finalize</span></button>}
          {saveState === "conflict" && <button className="a-button a-button--secondary -small" type="button" onClick={() => window.location.reload()}><span className="a-button__label">Reload report</span></button>}
        </div>
      </section>

      {isEditingLayout && (
        <section className="mrm-layout-tools" aria-label="Layout tools">
          <div>
            <strong>Layout mode</strong>
            <span>Edit shared headings, highlight rows, or change their order within each table.</span>
          </div>
          <label className="mrm-field" htmlFor="mrm-new-column-type">
            <span>New column type</span>
            <select id="mrm-new-column-type" value={newColumnType} onChange={(event) => setNewColumnType(event.target.value as MrmColumnType)}>
              <option value="value">Editable value</option>
              <option value="status">Status</option>
              <option value="attachment">Attachment</option>
            </select>
          </label>
          <button className="a-button a-button--secondary -small" type="button" onClick={addColumn}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add column</span>
          </button>
          <button className="a-button a-button--integrated -small" type="button" onClick={() => window.location.reload()}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
            <span className="a-button__label">Reload</span>
          </button>
        </section>
      )}

      {message && <p className="mrm-message" role="status">{message}</p>}

      {reportTables(document.rows).map((table) => <section className="mrm-report" aria-labelledby={`mrm-table-${table.key}`} key={table.key}>
        <header className="mrm-report__header">
          <div>
            <p>Performance Dashboard</p>
            <h2 id={`mrm-table-${table.key}`}>{table.title}</h2>
          </div>
          {isEditingLayout && <button className="a-button a-button--secondary -small" type="button" onClick={() => addRow(table.key)}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add KPI row</span>
          </button>}
        </header>
        <div className="mrm-table-scroll">
          <table className="mrm-table">
            <thead>
              <tr>
                <th scope="col" className="mrm-table__kpi-column">KPI</th>
                {document.columns.map((column, columnIndex) => (
                  <th scope="col" key={column.id}>
                    {isEditingLayout && !column.managed ? (
                      <textarea aria-label={`Column ${columnIndex + 1} heading`} rows={2} value={column.label} onChange={(event) => mutateDocument((current) => ({
                        ...current,
                        columns: current.columns.map((item) => item.id === column.id ? { ...item, label: event.target.value } : item),
                      }))} />
                    ) : <span>{column.label}</span>}
                    {isEditingLayout && (
                      <div className="mrm-column-actions">
                        <button type="button" aria-label={`Move ${column.label} left`} disabled={columnIndex === 0} onClick={() => mutateDocument((current) => ({ ...current, columns: moveItem(current.columns, columnIndex, -1) }))}><i className="a-icon boschicon-bosch-ic-arrow-left" aria-hidden="true" /></button>
                        <button type="button" aria-label={`Move ${column.label} right`} disabled={columnIndex === document.columns.length - 1} onClick={() => mutateDocument((current) => ({ ...current, columns: moveItem(current.columns, columnIndex, 1) }))}><i className="a-icon boschicon-bosch-ic-arrow-right" aria-hidden="true" /></button>
                        {!column.managed && <button type="button" aria-label={`Remove ${column.label}`} onClick={() => mutateDocument((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }))}><i className="a-icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={row.key} className={row.highlighted ? "is-highlighted" : row.muted ? "is-muted" : undefined}>
                  <th scope="row">
                    {isEditingLayout ? (
                      <div className="mrm-row-editor">
                        <input aria-label={`KPI name for row ${rowIndex + 1}`} disabled={row.managed} value={row.title} onChange={(event) => updateRow(row.key, { title: event.target.value })} />
                        <input aria-label={`KPI description for ${row.title}`} disabled={row.managed} placeholder="Description" value={row.description} onChange={(event) => updateRow(row.key, { description: event.target.value })} />
                        <label><input type="checkbox" checked={row.highlighted} onChange={(event) => updateRow(row.key, { highlighted: event.target.checked })} /> Highlight row</label>
                        <div className="mrm-row-actions">
                          <button type="button" aria-label={`Move ${row.title} up`} disabled={rowIndex === 0} onClick={() => moveRow(row.key, -1)}><i className="a-icon boschicon-bosch-ic-arrow-up" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Move ${row.title} down`} disabled={rowIndex === table.rows.length - 1} onClick={() => moveRow(row.key, 1)}><i className="a-icon boschicon-bosch-ic-arrow-down" aria-hidden="true" /></button>
                          {!row.managed && <button type="button" aria-label={`Remove ${row.title}`} onClick={() => mutateDocument((current) => ({ ...current, rows: current.rows.filter((item) => item.key !== row.key) }))}><i className="a-icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>}
                        </div>
                      </div>
                    ) : (
                      <>{row.emphasized === false ? <span>{row.title}</span> : <strong>{row.title}</strong>}{row.description && <small>{row.description}</small>}</>
                    )}
                  </th>
                  {document.columns.map((column) => (
                    <td key={column.id} className={`mrm-cell mrm-cell--${column.type}`}>
                      {column.type === "value" && <input aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}`} readOnly={!canEdit || row.mode === "calculated"} value={String(row.cells[column.key] ?? "")} placeholder={!document.sourceStatus.available && row.mode === "calculated" ? "Unavailable" : undefined} onChange={(event) => updateCell(row.key, column.key, event.target.value)} />}
                      {column.type === "status" && <button type="button" disabled={!canEdit || row.mode === "calculated"} className="mrm-status-button" aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}: ${String(row.cells[column.key] || "not set")}. Select to change.`} title="Select to change status" onClick={() => cycleStatus(row, column)}>{row.cells[column.key] ? <i className={`mrm-status-dot is-${String(row.cells[column.key])}`} /> : <span>Set</span>}</button>}
                      {column.type === "attachment" && (() => {
                        const attachments = document.attachments.filter((item) => item.rowKey === row.key && item.columnId === column.key);
                        return <div className="mrm-attachment-list">
                          {attachments.map((attachment) => <div className="mrm-attachment" key={attachment.id}><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><a href={`/api/mrm/reports/${encodeURIComponent(document.reportingMonth)}/attachments/${encodeURIComponent(attachment.id)}`} title={attachment.filename}>{attachment.filename}</a>{canEdit && <button type="button" aria-label={`Delete attachment ${attachment.filename}`} onClick={() => void deleteAttachment(attachment.id)}><i className="a-icon boschicon-bosch-ic-close" aria-hidden="true" /></button>}</div>)}
                          {canEdit && <label className="mrm-attachment-picker" title="Upload attachment"><input type="file" accept=".pdf,.xlsx,.docx,.png,.jpg,.jpeg" onChange={(event) => void chooseAttachment(row.key, column.key, event)} /><i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" /><span>Add</span></label>}
                        </div>;
                      })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>)}
    </main>
  );
}