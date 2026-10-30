export type MrmColumnType = "value" | "status" | "attachment";
export type MrmReportStatus = "draft" | "finalized";

export type MrmColumn = {
  id: string;
  key: string;
  label: string;
  type: MrmColumnType;
  managed: boolean;
};

export type MrmRow = {
  key: string;
  tableKey: string;
  calculationKey: string | null;
  title: string;
  description: string;
  mode: "manual" | "calculated";
  highlighted: boolean;
  muted: boolean;
  emphasized: boolean;
  managed: boolean;
  cells: Record<string, unknown>;
};

export type MrmAttachment = {
  id: string;
  rowKey: string;
  columnId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type MrmReportDocument = {
  schemaVersion: 1;
  reportingMonth: string;
  dataMonth: string;
  status: MrmReportStatus;
  revision: number;
  canManage: boolean;
  sourceStatus: { available: boolean; source: "live" | "history" | "snapshot" | null };
  columns: MrmColumn[];
  rows: MrmRow[];
  attachments: MrmAttachment[];
  updatedAt: string | null;
  finalizedAt: string | null;
};

export type MrmMonth = {
  reportingMonth: string;
  dataMonth: string;
  status: MrmReportStatus;
  sourceStatus: MrmReportDocument["sourceStatus"];
};

export type MrmMonthsResponse = { currentMonth: string; months: MrmMonth[] };

export type MrmSavePayload = {
  expectedRevision: number;
  columns: Array<Pick<MrmColumn, "key" | "label" | "type" | "managed">>;
  rows: Array<Omit<MrmRow, "mode" | "calculationKey">>;
};