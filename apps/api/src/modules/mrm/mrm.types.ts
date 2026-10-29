export type MrmColumnType = 'value' | 'status' | 'attachment';
export type MrmValueMode = 'manual' | 'calculated';
export type MrmReportStatus = 'draft' | 'finalized';

export type MrmColumn = {
  id: string;
  key: string;
  label: string;
  type: MrmColumnType;
  managed: boolean;
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

export type MrmRow = {
  key: string;
  title: string;
  description: string;
  mode: MrmValueMode;
  highlighted: boolean;
  muted: boolean;
  emphasized: boolean;
  managed: boolean;
  cells: Record<string, unknown>;
};

export type MrmSourceStatus = {
  available: boolean;
  source: 'live' | 'history' | null;
};

export type MrmReportDocument = {
  schemaVersion: 1;
  reportingMonth: string;
  dataMonth: string;
  status: MrmReportStatus;
  revision: number;
  canManage: boolean;
  sourceStatus: MrmSourceStatus;
  columns: MrmColumn[];
  rows: MrmRow[];
  attachments: MrmAttachment[];
  updatedAt: string | null;
  finalizedAt: string | null;
};

export type MrmMetricBucket = {
  metricKey: string;
  rangeKey: string;
  orgUnitKey: string;
  numerator: number;
  denominator: number | null;
  qualityCount: number;
};

export type MrmCalculation = {
  sourceStatus: MrmSourceStatus;
  buckets: MrmMetricBucket[];
};

export type MrmSaveColumn = {
  key: string;
  label: string;
  type: MrmColumnType;
  managed: boolean;
};

export type MrmSaveRow = {
  key: string;
  title: string;
  description: string;
  highlighted: boolean;
  muted: boolean;
  emphasized: boolean;
  managed: boolean;
  cells: Record<string, unknown>;
};

export type MrmSaveInput = {
  expectedRevision: number;
  columns: MrmSaveColumn[];
  rows: MrmSaveRow[];
};

export type MrmUploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};