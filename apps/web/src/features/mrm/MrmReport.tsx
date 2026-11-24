"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
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

function calculatedCellValue(row: MrmRow, column: MrmColumn) {
  const value = String(row.cells[column.key] ?? "");
  if (row.calculationKey !== "gender-hiring") {
    return <span className="mrm-calculated-value">{value}</span>;
  }
  const values = value.split(" | ").filter(Boolean);
  return (
    <span className="mrm-calculated-value is-gender-hiring">
      {values.map((item) => <span key={item}>{item}</span>)}
    </span>
  );
}

function calculatedInputValue(row: MrmRow, column: MrmColumn) {
  const value = String(row.cells[column.key] ?? "");
  return row.calculationKey === "gender-hiring" ? value.replaceAll(" | ", "\n") : value;
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
type PulSource = { value: string; header: string; previousValue: string | null };
type GenderPreviewRow = { row: number; name: string; joiningDate: string; orgUnit: string; range: string | null; inCorp: boolean };
type GenderPreviewMonth = { month: string; rows: GenderPreviewRow[]; inCount: number; corpCount: number };
type LeadTimeRow = GenderPreviewRow & { leadTime: number; leadTimeMissing: boolean };
type GenderPreview = { latest: GenderPreviewMonth; previous: GenderPreviewMonth; leadTimeRows: LeadTimeRow[]; unmappedOrgUnits: string[]; unreadableDates: { row: number; name: string; text: string }[]; fileName?: string };

function savePayload(source: MrmReportDocument): MrmSavePayload {
  return {
    expectedRevision: source.revision,
    columns: source.columns.map(({ key, label, type, managed }) => ({ key, label, type, managed })),
    rows: source.rows.map(({ mode, calculationKey: _calculationKey, ...row }) => {
      const cells = mode === "manual"
        ? row.cells
        : Object.fromEntries(row.overrideColumns.flatMap((columnKey) => (
          Object.hasOwn(row.cells, columnKey) ? [[columnKey, row.cells[columnKey]]] : []
        )));
      return { ...row, cells };
    }),
  };
}

export function MrmReport({ initialReport, months }: MrmReportProps) {
  const router = useRouter();
  const [document, setDocument] = useState(initialReport);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(() => new Set());
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [newColumnType, setNewColumnType] = useState<MrmColumnType>("value");
  const [message, setMessage] = useState("");
  const [pulBusy, setPulBusy] = useState(false);
  const pulInputRef = useRef<HTMLInputElement>(null);
  const [genderBusy, setGenderBusy] = useState(false);
  const genderInputRef = useRef<HTMLInputElement>(null);
  const genderDialogRef = useRef<HTMLDialogElement>(null);
  const [genderPreview, setGenderPreview] = useState<GenderPreview | null>(null);
  const [genderMonth, setGenderMonth] = useState<"latest" | "previous">("latest");
  const [genderCorpOverrides, setGenderCorpOverrides] = useState<Record<number, boolean>>({});
  const [previewTab, setPreviewTab] = useState<"gender" | "lead">("gender");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving" | "error" | "conflict">("saved");
  const canEdit = document.canManage && document.status === "draft";
  const visibleColumns = document.columns.filter((column) => column.type !== "attachment");

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
        ? {
          ...row,
          overrideColumns: row.mode === "calculated"
            ? [...new Set([...row.overrideColumns, columnId])]
            : row.overrideColumns,
          cells: { ...row.cells, [columnId]: value },
        }
        : row),
    }));
  };

  const uploadPul = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 50 * 1024 * 1024) {
      setMessage("Choose an XLSX file smaller than 50 MB.");
      return;
    }
    if (!document.columns.some((column) => column.key === "rolling-latest")) {
      setMessage("The report has no reporting-month column.");
      return;
    }
    setPulBusy(true);
    setMessage("");
    try {
      const csrf = getCsrfToken();
      const body = new FormData();
      body.append("dataMonth", document.dataMonth);
      body.append("file", file);
      const response = await fetch("/api/mrm/pul-value", {
        method: "POST",
        headers: csrf ? { "X-CSRF-Token": csrf } : undefined,
        body,
      });
      const result = await response.json().catch(() => null) as { corp?: PulSource | null; in?: PulSource | null; indirectMss?: PulSource | null; directMss?: PulSource | null; errors?: string[]; message?: string } | null;
      if (!response.ok || !result || (!result.corp && !result.in && !result.indirectMss && !result.directMss)) throw new Error(result?.message || "The PUL file could not be read.");
      const notes: string[] = [];
      const hasPrevious = document.columns.some((column) => column.key === "rolling-previous");
      const previousEmpty = (rowKey: string) => hasPrevious && !String(document.rows.find((item) => item.key === rowKey)?.cells["rolling-previous"] ?? "").trim();
      const fill = (rowKey: string, label: string, source: PulSource | null | undefined) => {
        if (!source) return;
        updateCell(rowKey, "rolling-latest", source.value);
        const fillPrevious = source.previousValue && previousEmpty(rowKey);
        if (fillPrevious) updateCell(rowKey, "rolling-previous", source.previousValue!);
        notes.push(`${label} ${source.value}`);
      };
      fill("corp-pul", "PS Corp PUL", result.corp);
      fill("pul", "PS-IN PUL", result.in);
      fill("indirect-mss", "t/o M&SS", result.indirectMss);
      fill("direct-mss", "Direct M&SS", result.directMss);
      if (result.indirectMss && result.directMss) {
        const sum = (a: string, b: string) => String(Number(a) + Number(b));
        const total = {
          value: sum(result.indirectMss.value, result.directMss.value),
          header: result.directMss.header,
          previousValue: result.indirectMss.previousValue !== null && result.directMss.previousValue !== null
            ? sum(result.indirectMss.previousValue, result.directMss.previousValue) : null,
        };
        fill("total-mss", "Total M&SS", total);
      }
      const header = (result.corp ?? result.in ?? result.indirectMss ?? result.directMss)!.header;
      setMessage(`${notes.join(", ")} (${header}).${result.errors?.length ? ` Skipped: ${result.errors.join(" ")}` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PUL file could not be read.");
    } finally {
      setPulBusy(false);
    }
  };

  const uploadGenderHiring = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 50 * 1024 * 1024) {
      setMessage("Choose an XLSX file smaller than 50 MB.");
      return;
    }
    if (!document.columns.some((column) => column.key === "rolling-latest")) {
      setMessage("The report has no reporting-month column.");
      return;
    }
    setGenderBusy(true);
    setMessage("");
    try {
      const csrf = getCsrfToken();
      const body = new FormData();
      body.append("dataMonth", document.dataMonth);
      body.append("file", file);
      const response = await fetch("/api/mrm/gender-hiring-value", {
        method: "POST",
        headers: csrf ? { "X-CSRF-Token": csrf } : undefined,
        body,
      });
      const result = await response.json().catch(() => null) as (GenderPreview & { message?: string }) | null;
      if (!response.ok || !result?.latest || !result.previous) throw new Error(result?.message || "The gender hiring file could not be read.");
      setGenderCorpOverrides({});
      setPreviewTab("gender");
      setGenderPreview({ ...result, fileName: file.name });
      setGenderMonth("latest");
      genderDialogRef.current?.showModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The gender hiring file could not be read.");
    } finally {
      setGenderBusy(false);
    }
  };

  const closeGenderPreview = () => {
    genderDialogRef.current?.close();
    setGenderPreview(null);
  };

  const inCorp = (item: GenderPreviewRow) => genderCorpOverrides[item.row] ?? item.inCorp;
  const corpCountOf = (month: GenderPreviewMonth) => month.rows.filter(inCorp).length;
  const leadRowsOf = (preview: GenderPreview, key: "latest" | "previous") => {
    const month = preview[key].month;
    return preview.leadTimeRows.filter((item) => item.joiningDate.slice(0, 4) === month.slice(0, 4) && item.joiningDate.slice(0, 7) <= month);
  };
  const averageOf = (items: LeadTimeRow[]) => (items.length ? Math.round(items.reduce((sum, item) => sum + item.leadTime, 0) / items.length) : 0);
  const leadAverages = (preview: GenderPreview, key: "latest" | "previous") => {
    const items = leadRowsOf(preview, key);
    return { count: items.length, inAverage: averageOf(items), corpAverage: averageOf(items.filter(inCorp)) };
  };

  const applyLeadTime = () => {
    if (!genderPreview) return;
    const hasPrevious = document.columns.some((column) => column.key === "rolling-previous");
    const latest = leadAverages(genderPreview, "latest");
    updateCell("hiring", "rolling-latest", String(latest.inAverage));
    updateCell("corp-hiring", "rolling-latest", String(latest.corpAverage));
    if (hasPrevious) {
      const previous = leadAverages(genderPreview, "previous");
      updateCell("hiring", "rolling-previous", String(previous.inAverage));
      updateCell("corp-hiring", "rolling-previous", String(previous.corpAverage));
    }
    setMessage(`Hiring performance applied: PS-IN ${latest.inAverage} days, PS Corp ${latest.corpAverage} days.`);
    closeGenderPreview();
  };

  const applyGenderPreview = () => {
    if (!genderPreview) return;
    const hasPrevious = document.columns.some((column) => column.key === "rolling-previous");
    const latestCorp = corpCountOf(genderPreview.latest);
    updateCell("gender-hiring", "rolling-latest", `F: ${genderPreview.latest.inCount}`);
    updateCell("corp-gender-hiring", "rolling-latest", `F: ${latestCorp}`);
    if (hasPrevious) {
      updateCell("gender-hiring", "rolling-previous", `F: ${genderPreview.previous.inCount}`);
      updateCell("corp-gender-hiring", "rolling-previous", `F: ${corpCountOf(genderPreview.previous)}`);
    }
    setMessage(`Gender hiring applied: PS-IN F: ${genderPreview.latest.inCount}, PS Corp F: ${latestCorp}.`);
    closeGenderPreview();
  };

  const changeReportingMonth = (reportingMonth: string) => {
    if (!reportingMonth) return;
    router.push(`/mrm?month=${encodeURIComponent(reportingMonth)}`);
  };

  const toggleTable = (tableKey: string) => {
    setExpandedTables((current) => {
      const next = new Set(current);
      if (next.has(tableKey)) next.delete(tableKey);
      else next.add(tableKey);
      return next;
    });
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
      rows: [...current.rows, {
        key, tableKey, calculationKey: null, title: "New KPI", description: "",
        mode: "manual", highlighted: false, muted: false, emphasized: true,
        managed: false, overrideColumns: [], cells: {},
      }],
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

  const finalizeReport = async () => {
    if (!window.confirm(`Finalize ${document.dataMonth}? Finalized reports cannot be changed.`)) return;
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

  const reportMatrix = () => reportTables(document.rows).flatMap((table, index) => [
    ...(index > 0 ? [[""]] : []),
    [table.title],
    ["KPI", ...visibleColumns.map((column) => column.label.replaceAll("\n", " "))],
    ...table.rows.map((row) => [
      row.description ? `${row.title} (${row.description})` : row.title,
      ...visibleColumns.map((column) => cellText(row, column)),
    ]),
  ]);

  const reportHtml = () => {
    const headers = ["KPI", ...visibleColumns.map((column) => column.label)]
      .map((label, index) => `<th style="background:#ffffff;border:1px solid #008ecf;border-bottom:2px solid #252525;font-size:16px;font-weight:700;height:58px;padding:6px;text-align:center;vertical-align:middle;white-space:normal;width:${index === 0 ? "250px" : "145px"}">${htmlValue(label).replaceAll("\n", "<br>")}</th>`)
      .join("");
    return reportTables(document.rows).map((table) => {
      const rows = table.rows.map((row) => {
        const background = row.highlighted ? "#bfe5f7" : row.muted ? "#c9c9c9" : "#ffffff";
        const title = htmlValue(row.title);
        const kpi = `${row.emphasized === false ? title : `<strong>${title}</strong>`}${row.description ? `<br><small>${htmlValue(row.description)}</small>` : ""}`;
        const cells = visibleColumns.map((column) => {
          const value = cellText(row, column);
          const statusSymbols: Record<string, string> = { Green: "🟢", Amber: "🟠", Red: "🔴" };
          const content = column.type === "status" && statusSymbols[value]
            ? `<span style="font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-size:20px">${statusSymbols[value]}</span>`
            : htmlValue(value);
          return `<td style="background:${background};border:1px solid #252525;font-size:15px;height:42px;mso-number-format:'\\@';padding:6px;text-align:center;vertical-align:middle;white-space:normal">${content}</td>`;
        }).join("");
        return `<tr><th style="background:${background};border:1px solid #252525;font-size:15px;height:42px;padding:6px;text-align:center;vertical-align:middle;white-space:normal;width:250px">${kpi}</th>${cells}</tr>`;
      }).join("");
      return `<h2 style="font-family:Arial,sans-serif">${htmlValue(table.title)}</h2><table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial,sans-serif;table-layout:fixed;width:${250 + (visibleColumns.length * 145)}px"><colgroup><col style="width:250px">${visibleColumns.map(() => '<col style="width:145px">').join("")}</colgroup><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }).join("<br>");
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
    link.download = `MRM-${document.dataMonth}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Formatted Excel table exported.");
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
            {months.map((month) => <option key={month.reportingMonth} value={month.reportingMonth}>{month.dataMonth} · {month.status}</option>)}
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
            <span>Edit headings, highlight rows, or change their order.</span>
          </div>
          <label className="mrm-field" htmlFor="mrm-new-column-type">
            <span>New column type</span>
            <select id="mrm-new-column-type" value={newColumnType} onChange={(event) => setNewColumnType(event.target.value as MrmColumnType)}>
              <option value="value">Editable value</option>
              <option value="status">Status</option>
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
      <dialog className="mrm-gender-dialog" ref={genderDialogRef} onCancel={(event) => { event.preventDefault(); closeGenderPreview(); }}>
        {genderPreview && (() => {
          const current = genderPreview[genderMonth];
          const label = (key: "latest" | "previous") => document.columns.find((column) => column.key === `rolling-${key}`)?.label ?? genderPreview[key].month;
          const reason = (item: GenderPreviewRow) => item.inCorp
            ? ""
            : item.range ? `${item.range} is a plant range` : "no range mapping";
          return <div className="mrm-gender-dialog__layout">
            <header className="mrm-gender-dialog__header">
              <div>
                <span>Gender Diversity Hiring</span>
                <h2>{genderPreview.fileName}</h2>
                <p>Women who joined in each month, counted from the Actual Date of Joining column.</p>
              </div>
              <button className="a-button a-button--integrated" type="button" aria-label="Close preview" onClick={closeGenderPreview}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
            </header>

                          <div className="mrm-gender-tabs" role="tablist" aria-label="Calculation">
                            <button type="button" role="tab" aria-selected={previewTab === "gender"} className="mrm-gender-tab" onClick={() => setPreviewTab("gender")}>Gender Diversity Hiring</button>
                            <button type="button" role="tab" aria-selected={previewTab === "lead"} className="mrm-gender-tab" onClick={() => setPreviewTab("lead")}>Hiring performance (Lead Time)</button>
                          </div>

                          {previewTab === "lead" && (() => {
                            const items = leadRowsOf(genderPreview, genderMonth);
                            const missing = items.filter((item) => item.leadTimeMissing);
                            return <>
                              <div className="mrm-gender-cards">
                                {(["previous", "latest"] as const).map((key) => {
                                  const stats = leadAverages(genderPreview, key);
                                  return <button key={key} type="button" aria-selected={genderMonth === key} className="mrm-gender-card" onClick={() => setGenderMonth(key)}>
                                    <span className="mrm-gender-card__month">{label(key)} column</span>
                                    <span className="mrm-gender-card__numbers">
                                      <span><strong>{stats.inAverage}</strong>PS-IN days</span>
                                      <span><strong>{stats.corpAverage}</strong>PS Corp days</span>
                                    </span>
                                    <span className="mrm-gender-card__hint">Average of {stats.count} {stats.count === 1 ? "joiner" : "joiners"}, Jan to {genderPreview[key].month}</span>
                                  </button>;
                                })}
                              </div>
                              <p className="mrm-gender-rule">
                                Average <strong>Lead Time to Offer</strong> of everyone whose Actual Date of Joining is from January up to the column month. <strong>PS-IN</strong> uses all of them; <strong>PS Corp</strong> leaves out the plant ranges BidP, NaP, JaP and GanP. Empty lead times count as 0.
                              </p>
                              {missing.length > 0 && <ul className="mrm-gender-warnings"><li>Lead Time to Offer is empty for {missing.length} {missing.length === 1 ? "person" : "people"} (Excel row {missing.map((item) => item.row).join(", ")}). Counted as 0.</li></ul>}
                              <h3 className="mrm-gender-list-title">{label(genderMonth)} column: {items.length} {items.length === 1 ? "person" : "people"}</h3>
                              <div className="mrm-gender-table">
                                <table>
                                  <thead><tr><th>Name</th><th>Date of joining</th><th>Specific org unit</th><th>Range</th><th>Lead time (days)</th><th>Counted in</th></tr></thead>
                                  <tbody>
                                    {items.map((item) => (
                                      <tr key={item.row}>
                                        <td>{item.name || `Excel row ${item.row}`}</td>
                                        <td>{item.joiningDate}</td>
                                        <td>{item.orgUnit || "-"}</td>
                                        <td>{item.range ?? "-"}</td>
                                        <td>{item.leadTimeMissing ? "0 (empty)" : item.leadTime}</td>
                                        <td>
                                          <select
                                            aria-label={`Counted in for ${item.name || `row ${item.row}`}`}
                                            className={`mrm-gender-select ${inCorp(item) ? "is-both" : item.range ? "is-in" : "is-warn"}`}
                                            value={inCorp(item) ? "both" : "in"}
                                            onChange={(event) => setGenderCorpOverrides((prev) => ({ ...prev, [item.row]: event.target.value === "both" }))}
                                          >
                                            <option value="both">PS-IN + PS Corp</option>
                                            <option value="in">PS-IN only</option>
                                          </select>
                                        </td>
                                      </tr>
                                    ))}
                                    {items.length === 0 && <tr><td colSpan={6}>No joiners in this period.</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                            </>;
                          })()}

                          {previewTab === "gender" && <>
            <div className="mrm-gender-cards" role="tablist" aria-label="Month to review">
              {(["previous", "latest"] as const).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={genderMonth === key} className="mrm-gender-card" onClick={() => setGenderMonth(key)}>
                  <span className="mrm-gender-card__month">{label(key)} column</span>
                  <span className="mrm-gender-card__numbers">
                    <span><strong>{genderPreview[key].inCount}</strong>PS-IN</span>
                    <span><strong>{corpCountOf(genderPreview[key])}</strong>PS Corp</span>
                  </span>
                  <span className="mrm-gender-card__hint">Click to see the {genderPreview[key].inCount} {genderPreview[key].inCount === 1 ? "person" : "people"}</span>
                </button>
              ))}
            </div>

            <p className="mrm-gender-rule">
              <strong>PS-IN</strong> counts every woman who joined that month.{" "}
              <strong>PS Corp</strong> counts the same women but leaves out the plant ranges BidP, NaP, JaP and GanP, using the range mapping of the Specific Org unit.
            </p>
            {(genderPreview.unmappedOrgUnits.length > 0 || genderPreview.unreadableDates.length > 0) && (
              <ul className="mrm-gender-warnings">
                {genderPreview.unmappedOrgUnits.length > 0 && <li>No range mapping for: {genderPreview.unmappedOrgUnits.join(", ")}. They are counted in PS-IN only unless you change "Counted in" below.</li>}
                {genderPreview.unreadableDates.length > 0 && <li>Date of joining could not be read for {genderPreview.unreadableDates.length} women (Excel row {genderPreview.unreadableDates.map((item) => item.row).join(", ")}). They are not counted.</li>}
              </ul>
            )}

            <h3 className="mrm-gender-list-title">{label(genderMonth)} column: {current.rows.length} {current.rows.length === 1 ? "person" : "people"}</h3>
            <div className="mrm-gender-table">
              <table>
                <thead><tr><th>Name</th><th>Date of joining</th><th>Specific org unit</th><th>Range</th><th>Counted in</th></tr></thead>
                <tbody>
                  {current.rows.map((item) => {
                    const changed = genderCorpOverrides[item.row] !== undefined && genderCorpOverrides[item.row] !== item.inCorp;
                    return <tr key={item.row}>
                      <td>{item.name || `Excel row ${item.row}`}</td>
                      <td>{item.joiningDate}</td>
                      <td>{item.orgUnit || "-"}</td>
                      <td>{item.range ?? "-"}</td>
                      <td>
                        <select
                          aria-label={`Counted in for ${item.name || `row ${item.row}`}`}
                          className={`mrm-gender-select ${inCorp(item) ? "is-both" : item.range ? "is-in" : "is-warn"}`}
                          value={inCorp(item) ? "both" : "in"}
                          onChange={(event) => setGenderCorpOverrides((prev) => ({ ...prev, [item.row]: event.target.value === "both" }))}
                        >
                          <option value="both">PS-IN + PS Corp</option>
                          <option value="in">PS-IN only</option>
                        </select>
                        {changed ? <small className="mrm-gender-note">Changed by you</small> : !item.inCorp && <small className="mrm-gender-note">{reason(item)}</small>}
                      </td>
                    </tr>;
                  })}
                  {current.rows.length === 0 && <tr><td colSpan={5}>No women joined in this month.</td></tr>}
                </tbody>
              </table>
            </div>
            </>}

            <footer className="mrm-gender-dialog__footer">
              <p>{previewTab === "gender"
                ? `Apply will fill the ${label("previous")} and ${label("latest")} columns of Gender Diversity Hiring in both tables.`
                : `Apply will fill the ${label("previous")} and ${label("latest")} columns of Hiring performance (WC) in both tables.`}</p>
              <div>
                <button className="a-button a-button--secondary" type="button" onClick={closeGenderPreview}><span className="a-button__label">Cancel</span></button>
                <button className="a-button a-button--primary" type="button" onClick={previewTab === "gender" ? applyGenderPreview : applyLeadTime}><span className="a-button__label">Apply to report</span></button>
              </div>
            </footer>
          </div>;
        })()}
      </dialog>

      {reportTables(document.rows).map((table) => {
        const isExpanded = expandedTables.has(table.key);
        const panelId = `mrm-table-panel-${table.key}`;
        return <section className="mrm-report" aria-labelledby={`mrm-table-${table.key}`} key={table.key}>
          <header className="mrm-report__header">
            <div>
              <p>Performance Dashboard</p>
              <h2>
                <button
                  className="mrm-report__toggle"
                  id={`mrm-table-${table.key}`}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleTable(table.key)}
                >
                  <span>{table.title}</span>
                  <i className={`a-icon ${isExpanded ? "boschicon-bosch-ic-up" : "boschicon-bosch-ic-down"}`} aria-hidden="true" />
                </button>
              </h2>
            </div>
            {canEdit && table.key === "ps-corp" && <div className="mrm-report__header-actions">
              <input ref={pulInputRef} hidden type="file" accept=".xlsx" onChange={(event) => void uploadPul(event)} />
              <button className="a-button a-button--secondary -small" type="button" disabled={pulBusy} onClick={() => pulInputRef.current?.click()}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-upload" aria-hidden="true" />
                <span className="a-button__label">{pulBusy ? "Reading..." : "PUL"}</span>
              </button>
              <input ref={genderInputRef} hidden type="file" accept=".xlsx" onChange={(event) => void uploadGenderHiring(event)} />
              <button className="a-button a-button--secondary -small" type="button" disabled={genderBusy} onClick={() => genderInputRef.current?.click()}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-upload" aria-hidden="true" />
                <span className="a-button__label">{genderBusy ? "Reading..." : "Gender Hiring"}</span>
              </button>
            </div>}
          </header>
          {isExpanded && <div className="mrm-report__panel" id={panelId}>
            {isEditingLayout && <div className="mrm-report__panel-actions">
              <button className="a-button a-button--secondary -small" type="button" onClick={() => addRow(table.key)}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
                <span className="a-button__label">Add KPI row</span>
              </button>
            </div>}
            <div className="mrm-table-scroll">
              <table className="mrm-table">
            <thead>
              <tr>
                <th scope="col" className="mrm-table__kpi-column">KPI</th>
                {visibleColumns.map((column, columnIndex) => (
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
                        <button type="button" aria-label={`Move ${column.label} right`} disabled={columnIndex === visibleColumns.length - 1} onClick={() => mutateDocument((current) => ({ ...current, columns: moveItem(current.columns, columnIndex, 1) }))}><i className="a-icon boschicon-bosch-ic-arrow-right" aria-hidden="true" /></button>
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
                  {visibleColumns.map((column) => (
                    <td key={column.id} className={`mrm-cell mrm-cell--${column.type}`}>
                      {column.type === "value" && row.mode === "calculated" && canEdit && (
                        <textarea
                          className="mrm-calculated-input"
                          aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}`}
                          rows={row.calculationKey === "gender-hiring" ? 2 : 1}
                          value={calculatedInputValue(row, column)}
                          onChange={(event) => updateCell(
                            row.key,
                            column.key,
                            row.calculationKey === "gender-hiring"
                              ? event.target.value.split("\n").map((part) => part.trim()).filter(Boolean).join(" | ")
                              : event.target.value,
                          )}
                        />
                      )}
                      {column.type === "value" && row.mode === "calculated" && !canEdit && (
                        <div aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}`}>
                          {row.cells[column.key] == null && !document.sourceStatus.available
                            ? <span className="mrm-calculated-value">Unavailable</span>
                            : calculatedCellValue(row, column)}
                        </div>
                      )}
                      {column.type === "value" && row.mode === "manual" && <input aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}`} readOnly={!canEdit} value={String(row.cells[column.key] ?? "")} onChange={(event) => updateCell(row.key, column.key, event.target.value)} />}
                      {column.type === "status" && <button type="button" disabled={!canEdit || row.mode === "calculated"} className="mrm-status-button" aria-label={`${row.title}, ${column.label.replaceAll("\n", " ")}: ${String(row.cells[column.key] || "not set")}. Select to change.`} title="Select to change status" onClick={() => cycleStatus(row, column)}>{row.cells[column.key] ? <i className={`mrm-status-dot is-${String(row.cells[column.key])}`} /> : <span>Set</span>}</button>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </div>}
        </section>;
      })}
    </main>
  );
}
