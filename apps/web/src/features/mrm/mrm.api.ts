import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type {
  MrmAttachment,
  MrmColumn,
  MrmMonth,
  MrmMonthsResponse,
  MrmReportDocument,
  MrmRow,
} from "./mrm.types";

type JsonRecord = Record<string, unknown>;

export class MrmApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
  const base = configured ? new URL(configured) : new URL("http://127.0.0.1:3001/api/v1");
  if (base.username || base.password) throw new Error("API_BASE_URL must not contain credentials");
  return base.toString().replace(/\/$/, "");
}

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`MRM API returned invalid ${field}`);
  return value as JsonRecord;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`MRM API returned invalid ${field}`);
  return value;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`MRM API returned invalid ${field}`);
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`MRM API returned invalid ${field}`);
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

function sourceStatus(value: unknown, field: string): MrmReportDocument["sourceStatus"] {
  const source = record(value, field);
  if (source.source !== null && source.source !== "live"
    && source.source !== "history" && source.source !== "snapshot") {
    throw new Error(`MRM API returned invalid ${field}.source`);
  }
  return { available: boolean(source.available, `${field}.available`), source: source.source };
}

function column(value: unknown, field: string): MrmColumn {
  const item = record(value, field);
  if (item.type !== "value" && item.type !== "status" && item.type !== "attachment") {
    throw new Error(`MRM API returned invalid ${field}.type`);
  }
  return {
    id: string(item.id, `${field}.id`), key: string(item.key, `${field}.key`),
    label: string(item.label, `${field}.label`), type: item.type,
    managed: boolean(item.managed, `${field}.managed`),
  };
}

function row(value: unknown, field: string): MrmRow {
  const item = record(value, field);
  if (item.mode !== "manual" && item.mode !== "calculated") throw new Error(`MRM API returned invalid ${field}.mode`);
  return {
    key: string(item.key, `${field}.key`), title: string(item.title, `${field}.title`),
    description: string(item.description, `${field}.description`), mode: item.mode,
    highlighted: boolean(item.highlighted, `${field}.highlighted`),
    muted: boolean(item.muted, `${field}.muted`),
    emphasized: boolean(item.emphasized, `${field}.emphasized`),
    managed: boolean(item.managed, `${field}.managed`),
    cells: record(item.cells, `${field}.cells`),
  };
}

function attachment(value: unknown, field: string): MrmAttachment {
  const item = record(value, field);
  return {
    id: string(item.id, `${field}.id`), rowKey: string(item.rowKey, `${field}.rowKey`),
    columnId: string(item.columnId, `${field}.columnId`),
    filename: string(item.filename, `${field}.filename`), mimeType: string(item.mimeType, `${field}.mimeType`),
    size: number(item.size, `${field}.size`), uploadedAt: string(item.uploadedAt, `${field}.uploadedAt`),
  };
}

export function parseMrmReport(value: unknown): MrmReportDocument {
  const item = record(value, "report");
  if (item.schemaVersion !== 1 || (item.status !== "draft" && item.status !== "finalized")
    || !Array.isArray(item.columns) || !Array.isArray(item.rows) || !Array.isArray(item.attachments)) {
    throw new Error("MRM API returned an invalid report");
  }
  return {
    schemaVersion: 1, reportingMonth: string(item.reportingMonth, "report.reportingMonth"),
    dataMonth: string(item.dataMonth, "report.dataMonth"), status: item.status,
    revision: number(item.revision, "report.revision"), canManage: boolean(item.canManage, "report.canManage"),
    sourceStatus: sourceStatus(item.sourceStatus, "report.sourceStatus"),
    columns: item.columns.map((value, index) => column(value, `report.columns[${index}]`)),
    rows: item.rows.map((value, index) => row(value, `report.rows[${index}]`)),
    attachments: item.attachments.map((value, index) => attachment(value, `report.attachments[${index}]`)),
    updatedAt: nullableString(item.updatedAt, "report.updatedAt"),
    finalizedAt: nullableString(item.finalizedAt, "report.finalizedAt"),
  };
}

function parseMonth(value: unknown, field: string): MrmMonth {
  const item = record(value, field);
  if (item.status !== "draft" && item.status !== "finalized") throw new Error(`MRM API returned invalid ${field}.status`);
  return {
    reportingMonth: string(item.reportingMonth, `${field}.reportingMonth`),
    dataMonth: string(item.dataMonth, `${field}.dataMonth`), status: item.status,
    sourceStatus: sourceStatus(item.sourceStatus, `${field}.sourceStatus`),
  };
}

async function errorFor(response: Response): Promise<MrmApiError> {
  const body = await response.json().catch(() => null) as { message?: unknown } | null;
  return new MrmApiError(typeof body?.message === "string" ? body.message : "MRM request failed.", response.status);
}

export async function forwardMrmRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${apiBaseUrl()}/mrm${path}`, {
    ...init, cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw await errorFor(response);
  return response;
}

export async function getMrmReport(reportingMonth: string): Promise<MrmReportDocument> {
  const response = await forwardMrmRequest(`/reports/${encodeURIComponent(reportingMonth)}`);
  return parseMrmReport(await response.json());
}

export async function getMrmMonths(): Promise<MrmMonthsResponse> {
  const response = await forwardMrmRequest("/months");
  const item = record(await response.json(), "months");
  if (!Array.isArray(item.months)) throw new Error("MRM API returned invalid months");
  return {
    currentMonth: string(item.currentMonth, "months.currentMonth"),
    months: item.months.map((value, index) => parseMonth(value, `months.months[${index}]`)),
  };
}