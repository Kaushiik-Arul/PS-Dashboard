export const attritionMovementViews = ['all', 'ps_attrition', 'within_ps', 'pending'] as const;

export type AttritionMovementView = (typeof attritionMovementViews)[number];

export type AttritionMovementItem = {
  id: string;
  recordType: 'event' | 'candidate';
  persNo: string;
  employeeName: string | null;
  month: string;
  category: 'ps_attrition' | 'within_ps' | 'departure_candidate';
  eventType: string | null;
  transferType: string | null;
  withinPsType: string | null;
  countsAsPsAttrition: boolean;
  status: string;
  source: string;
  exitLwd: string | null;
  exitReason: string | null;
  oldOrganisationalAreaPa: string | null;
  newOrganisationalAreaPa: string | null;
  oldOrganizationalUnit: string | null;
  newOrganizationalUnit: string | null;
  oldRange: string | null;
  newRange: string | null;
  oldRangeType: string | null;
  newRangeType: string | null;
};

export type AttritionMovementCounts = {
  all: number;
  psAttrition: number;
  withinPs: number;
  withinPsBreakdown: {
    plantToPlant: number;
    plantToCorp: number;
    corpToPlant: number;
    corpToCorp: number;
  };
  pending: number;
};

export type AttritionMovementsPage = {
  items: AttritionMovementItem[];
  total: number;
  counts: AttritionMovementCounts;
  availablePeriods: string[];
  page: number;
  pageSize: number;
  view: AttritionMovementView;
  search: string;
  year: number | null;
  month: number | null;
};

export type PendingAttritionCandidate = {
  id: string;
  persNo: string;
  employeeName: string | null;
  detectedMonth: string;
  source: string;
  previousOrganisationalAreaPa: string | null;
  previousOrganizationalUnit: string | null;
  previousRange: string | null;
  previousRangeType: string | null;
};

export type ConfirmPendingCandidateInput = {
  exitLwd: string;
  movementType: 'resignation' | 'retirement' | 'transfer';
  exitReason: string;
  notes: string | null;
};

export type ConfirmPendingCandidateResult =
  | { status: 'confirmed'; eventId: string }
  | { status: 'not_found' }
  | { status: 'conflict' };

export type ConfirmedAttritionExportRow = {
  eventId: string;
  persNo: string;
  employeeName: string | null;
  eventMonth: string;
  exitLwd: string | null;
  eventType: string;
  transferType: string | null;
  withinPsType: string | null;
  countsAsPsAttrition: boolean;
  classificationStatus: string;
  source: string;
  exitReason: string | null;
  oldOrganisationalAreaPa: string | null;
  newOrganisationalAreaPa: string | null;
  oldOrganizationalUnit: string | null;
  newOrganizationalUnit: string | null;
  oldRange: string | null;
  newRange: string | null;
  oldRangeType: string | null;
  newRangeType: string | null;
  notes: string | null;
  isReviewed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ConfirmedAttritionExport = {
  fileName: string;
  buffer: Buffer;
};