"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import "./mrm.css";

type ColumnType = "value" | "status" | "attachment";
type Status = "" | "green" | "amber" | "red";

type MrmColumn = {
  id: string;
  label: string;
  type: ColumnType;
  managed?: boolean;
};

type MrmRow = {
  id: string;
  title: string;
  description: string;
  highlighted: boolean;
  cells: Record<string, string>;
};

type MrmDocument = {
  reportingMonth: string;
  columns: MrmColumn[];
  rows: MrmRow[];
};

const storageKey = "ps-dashboard:mrm-prototype:v1";
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const statuses: Status[] = ["", "green", "amber", "red"];

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rollingMonths(reportingMonth: string): MrmColumn[] {
  const [year, month] = reportingMonth.split("-").map(Number);
  return Array.from({ length: 2 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 3 + index, 1));
    return {
      id: `month-${monthKey(date)}`,
      label: `${monthNames[date.getUTCMonth()]}'${String(date.getUTCFullYear()).slice(-2)}`,
      type: "value" as const,
      managed: true,
    };
  });
}

function managedColumns(reportingMonth: string): MrmColumn[] {
  const year = Number(reportingMonth.slice(0, 4));
  return [
    { id: "actual", label: "Actual\n2025", type: "value", managed: true },
    { id: "target", label: "Target\nTBP'26", type: "value", managed: true },
    ...rollingMonths(reportingMonth),
    { id: "status", label: `YTD'${String(year).slice(-2)}\nagainst TBP.${String(year).slice(-2)}`, type: "status", managed: true },
    { id: "attachments", label: "Attachments", type: "attachment", managed: true },
  ];
}

function initialRows(): MrmRow[] {
  return [
    { id: "pul", title: "PUL", description: "", highlighted: true, cells: { status: "amber" } },
    { id: "hiring", title: "Hiring performance (WC)", description: "Turn around time - Job Ad to offer date", highlighted: true, cells: { status: "green" } },
    { id: "expat", title: "Expat", description: "1% of PUL26", highlighted: false, cells: { status: "red" } },
    { id: "attrition", title: "Attrition", description: "Exit from organization", highlighted: true, cells: { status: "green" } },
    { id: "rotation", title: "Job Rotation", description: "t/o Transfer within Bosch", highlighted: true, cells: {} },
    { id: "transfer", title: "t/o Transfer within plant / within Corp", description: "", highlighted: true, cells: {} },
    { id: "sul", title: "SUL", description: "", highlighted: false, cells: { status: "amber" } },
    { id: "women-slx", title: "Women in SLx", description: "", highlighted: false, cells: { status: "amber" } },
    { id: "women-hc", title: "% Women in overall HC (M&SS)", description: "", highlighted: false, cells: { status: "red" } },
    { id: "gender-hiring", title: "Gender Diversity Hiring", description: "", highlighted: true, cells: { status: "amber" } },
    { id: "succession", title: "Succession Planning Coverage (SLx)", description: "", highlighted: true, cells: { status: "green" } },
  ];
}

function defaultDocument(reportingMonth: string): MrmDocument {
  return { reportingMonth, columns: managedColumns(reportingMonth), rows: initialRows() };
}

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
  const value = row.cells[column.id] ?? "";
  if (column.type === "status") return value ? value[0].toUpperCase() + value.slice(1) : "";
  return value;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function MrmReport({ initialReportingMonth }: { initialReportingMonth: string }) {
  const [document, setDocument] = useState(() => defaultDocument(initialReportingMonth));
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [newColumnType, setNewColumnType] = useState<ColumnType>("value");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const savedDocument = JSON.parse(saved) as MrmDocument;
        const customColumns = savedDocument.columns.filter((column) => !column.managed);
        const nextManagedColumns = managedColumns(savedDocument.reportingMonth);
        setDocument({
          ...savedDocument,
          columns: [...nextManagedColumns.slice(0, -1), ...customColumns, nextManagedColumns.at(-1)!],
        });
      }
    } catch {
      setMessage("The saved local draft could not be loaded.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(document));
  }, [document, hasLoaded]);

  const updateRow = (rowId: string, changes: Partial<MrmRow>) => {
    setDocument((current) => ({
      ...current,
      rows: current.rows.map((row) => row.id === rowId ? { ...row, ...changes } : row),
    }));
  };

  const updateCell = (rowId: string, columnId: string, value: string) => {
    setDocument((current) => ({
      ...current,
      rows: current.rows.map((row) => row.id === rowId
        ? { ...row, cells: { ...row.cells, [columnId]: value } }
        : row),
    }));
  };

  const changeReportingMonth = (reportingMonth: string) => {
    if (!reportingMonth) return;
    setDocument((current) => {
      const customColumns = current.columns.filter((column) => !column.managed);
      const nextManagedColumns = managedColumns(reportingMonth);
      return { ...current, reportingMonth, columns: [...nextManagedColumns.slice(0, -1), ...customColumns, nextManagedColumns.at(-1)!] };
    });
    setMessage("Reporting period updated.");
  };

  const addColumn = () => {
    const column: MrmColumn = { id: newId("column"), label: "New column", type: newColumnType };
    setDocument((current) => {
      const attachmentIndex = current.columns.findIndex((item) => item.type === "attachment");
      const columns = [...current.columns];
      columns.splice(attachmentIndex < 0 ? columns.length : attachmentIndex, 0, column);
      return { ...current, columns };
    });
    setMessage("Column added. Rename it in the table header.");
  };

  const addRow = () => {
    setDocument((current) => ({
      ...current,
      rows: [...current.rows, { id: newId("row"), title: "New KPI", description: "", highlighted: false, cells: {} }],
    }));
    setMessage("KPI row added.");
  };

  const cycleStatus = (row: MrmRow, column: MrmColumn) => {
    const current = (row.cells[column.id] ?? "") as Status;
    updateCell(row.id, column.id, statuses[(statuses.indexOf(current) + 1) % statuses.length]);
  };

  const chooseAttachment = (rowId: string, columnId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) updateCell(rowId, columnId, file.name);
    event.target.value = "";
  };

  const reportMatrix = () => [
    ["KPI", ...document.columns.map((column) => column.label.replaceAll("\n", " "))],
    ...document.rows.map((row) => [
      row.description ? `${row.title} (${row.description})` : row.title,
      ...document.columns.map((column) => cellText(row, column)),
    ]),
  ];

  const reportHtml = () => {
    const headers = ["KPI", ...document.columns.map((column) => column.label)]
      .map((label, index) => `<th style="background:#ffffff;border:1px solid #008ecf;border-bottom:2px solid #252525;font-size:16px;font-weight:700;height:58px;padding:6px;text-align:center;vertical-align:middle;white-space:normal;width:${index === 0 ? "250px" : "145px"}">${htmlValue(label).replaceAll("\n", "<br>")}</th>`)
      .join("");
    const rows = document.rows.map((row) => {
      const background = row.highlighted ? "#bfe5f7" : "#ffffff";
      const kpi = `<strong>${htmlValue(row.title)}</strong>${row.description ? `<br><small>${htmlValue(row.description)}</small>` : ""}`;
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
    return `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial,sans-serif;table-layout:fixed;width:${250 + (document.columns.length * 145)}px"><colgroup><col style="width:250px">${document.columns.map(() => '<col style="width:145px">').join("")}</colgroup><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
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
      setMessage("Table copied. Paste it into Excel or PowerPoint.");
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
    setMessage("Formatted Excel table exported.");
  };

  const resetReport = () => {
    if (!window.confirm("Reset the MRM prototype and remove your local changes?")) return;
    setDocument(defaultDocument(document.reportingMonth));
    setMessage("Local changes reset.");
  };

  return (
    <main className="mrm-page">
      <header className="mrm-header">
        <div>
          <p className="mrm-header__eyebrow">Monthly reporting</p>
          <h1>Management Review Meeting</h1>
          <p className="mrm-header__description">Prepare the rolling KPI table, complete manual values, and share it with the monthly review.</p>
        </div>
        <div className="mrm-header__actions">
          <button className="a-button a-button--secondary -small" type="button" onClick={() => void copyReport()}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-copy" aria-hidden="true" />
            <span className="a-button__label">Copy table</span>
          </button>
          <button className="a-button a-button--secondary -small" type="button" onClick={exportExcel}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-download" aria-hidden="true" />
            <span className="a-button__label">Export Excel</span>
          </button>
          <button className={`a-button ${isEditingLayout ? "a-button--primary" : "a-button--secondary"} -small`} type="button" onClick={() => setIsEditingLayout((editing) => !editing)}>
            <i className={`a-icon a-button__icon ${isEditingLayout ? "boschicon-bosch-ic-checkmark" : "boschicon-bosch-ic-edit"}`} aria-hidden="true" />
            <span className="a-button__label">{isEditingLayout ? "Done" : "Edit layout"}</span>
          </button>
        </div>
      </header>

      <section className="mrm-toolbar" aria-label="MRM report settings">
        <label className="mrm-field" htmlFor="mrm-reporting-month">
          <span>Reporting month</span>
          <input id="mrm-reporting-month" type="month" value={document.reportingMonth} onChange={(event) => changeReportingMonth(event.target.value)} />
        </label>
        <div className="mrm-toolbar__legend" aria-label="Status legend">
          <span><i className="mrm-status-dot is-green" />On track</span>
          <span><i className="mrm-status-dot is-amber" />Attention</span>
          <span><i className="mrm-status-dot is-red" />Off track</span>
        </div>
        <span className="mrm-toolbar__save-state"><i className="a-icon boschicon-bosch-ic-save" aria-hidden="true" /> Saved in this browser</span>
      </section>

      {isEditingLayout && (
        <section className="mrm-layout-tools" aria-label="Layout tools">
          <div>
            <strong>Layout mode</strong>
            <span>Edit headings, highlight rows, or change their order.</span>
          </div>
          <label className="mrm-field" htmlFor="mrm-new-column-type">
            <span>New column type</span>
            <select id="mrm-new-column-type" value={newColumnType} onChange={(event) => setNewColumnType(event.target.value as ColumnType)}>
              <option value="value">Editable value</option>
              <option value="status">Status</option>
              <option value="attachment">Attachment</option>
            </select>
          </label>
          <button className="a-button a-button--secondary -small" type="button" onClick={addColumn}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add column</span>
          </button>
          <button className="a-button a-button--secondary -small" type="button" onClick={addRow}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add KPI row</span>
          </button>
          <button className="a-button a-button--integrated -small" type="button" onClick={resetReport}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
            <span className="a-button__label">Reset</span>
          </button>
        </section>
      )}

      {message && <p className="mrm-message" role="status">{message}</p>}

      <section className="mrm-report" aria-label={`MRM report for ${document.reportingMonth}`}>
        <div className="mrm-table-scroll">
          <table className="mrm-table">
            <thead>
              <tr>
                <th scope="col" className="mrm-table__kpi-column">KPI</th>
                {document.columns.map((column, columnIndex) => (
                  <th scope="col" key={column.id}>
                    {isEditingLayout && !column.managed ? (
                      <textarea aria-label={`Column ${columnIndex + 1} heading`} rows={2} value={column.label} onChange={(event) => setDocument((current) => ({
                        ...current,
                        columns: current.columns.map((item) => item.id === column.id ? { ...item, label: event.target.value } : item),
                      }))} />
                    ) : <span>{column.label}</span>}
                    {isEditingLayout && (
                      <div className="mrm-column-actions">
                        <button type="button" aria-label={`Move ${column.label} left`} disabled={columnIndex === 0} onClick={() => setDocument((current) => ({ ...current, columns: moveItem(current.columns, columnIndex, -1) }))}><i className="a-icon boschicon-bosch-ic-arrow-left" aria-hidden="true" /></button>
                        <button type="button" aria-label={`Move ${column.label} right`} disabled={columnIndex === document.columns.length - 1} onClick={() => setDocument((current) => ({ ...current, columns: moveItem(current.columns, columnIndex, 1) }))}><i className="a-icon boschicon-bosch-ic-arrow-right" aria-hidden="true" /></button>
                        {!column.managed && <button type="button" aria-label={`Remove ${column.label}`} onClick={() => setDocument((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }))}><i className="a-icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {document.rows.map((row, rowIndex) => (
                <tr key={row.id} className={row.highlighted ? "is-highlighted" : undefined}>
                  <th scope="row">
                    {isEditingLayout ? (
                      <div className="mrm-row-editor">
                        <input aria-label={`KPI name for row ${rowIndex + 1}`} value={row.title} onChange={(event) => updateRow(row.id, { title: event.target.value })} />
                        <input aria-label={`KPI description for ${row.title}`} placeholder="Description" value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} />
                        <label><input type="checkbox" checked={row.highlighted} onChange={(event) => updateRow(row.id, { highlighted: event.target.checked })} /> Highlight row</label>
                        <div className="mrm-row-actions">
                          <button type="button" aria-label={`Move ${row.title} up`} disabled={rowIndex === 0} onClick={() => setDocument((current) => ({ ...current, rows: moveItem(current.rows, rowIndex, -1) }))}><i className="a-icon boschicon-bosch-ic-arrow-up" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Move ${row.title} down`} disabled={rowIndex === document.rows.length - 1} onClick={() => setDocument((current) => ({ ...current, rows: moveItem(current.rows, rowIndex, 1) }))}><i className="a-icon boschicon-bosch-ic-arrow-down" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Remove ${row.title}`} onClick={() => setDocument((current) => ({ ...current, rows: current.rows.filter((item) => item.id !== row.id) }))}><i className="a-icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
                        </div>
                      </div>
                    ) : (
                      <><strong>{row.title}</strong>{row.description && <small>{row.description}</small>}</>
                    )}
                  </th>
                  {document.columns.map((column) => (
                    <td key={column.id} className={`mrm-cell mrm-cell--${column.type}`}>
                      {column.type === "value" && <input aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}`} value={row.cells[column.id] ?? ""} onChange={(event) => updateCell(row.id, column.id, event.target.value)} />}
                      {column.type === "status" && <button type="button" className="mrm-status-button" aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}: ${row.cells[column.id] || "not set"}. Select to change.`} title="Select to change status" onClick={() => cycleStatus(row, column)}>{row.cells[column.id] ? <i className={`mrm-status-dot is-${row.cells[column.id]}`} /> : <span>Set</span>}</button>}
                      {column.type === "attachment" && (row.cells[column.id]
                        ? <div className="mrm-attachment"><i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" /><span title={row.cells[column.id]}>{row.cells[column.id]}</span><button type="button" aria-label={`Remove attachment ${row.cells[column.id]}`} onClick={() => updateCell(row.id, column.id, "")}><i className="a-icon boschicon-bosch-ic-close" aria-hidden="true" /></button></div>
                        : <label className="mrm-attachment-picker" title="Choose attachment"><input type="file" onChange={(event) => chooseAttachment(row.id, column.id, event)} /><i className="a-icon boschicon-bosch-ic-upload" aria-hidden="true" /><span>Add</span></label>)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}