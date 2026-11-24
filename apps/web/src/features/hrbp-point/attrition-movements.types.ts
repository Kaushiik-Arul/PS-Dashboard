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

export type AttritionMovementsPage = {
  items: AttritionMovementItem[];
  total: number;
  counts: {
    all: number;
    psAttrition: number;
    withinPs: number;
    pending: number;
    withinPsBreakdown: { plantToPlant: number; plantToCorp: number; corpToPlant: number; corpToCorp: number };
  };
  availablePeriods: string[];
  page: number;
  pageSize: number;
  view: AttritionMovementView;
  search: string;
  year: number | null;
  month: number | null;
};

export type AttritionMovementQuery = {
  view: AttritionMovementView;
  search: string;
  year: number | null;
  month: number | null;
  page: number;
  pageSize: number;
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
  notes: string;
};

export interface AttritionMovementsClient {
  list(query: AttritionMovementQuery): Promise<AttritionMovementsPage>;
  getPendingCandidate(candidateId: string): Promise<PendingAttritionCandidate>;
  confirmPendingCandidate(candidateId: string, input: ConfirmPendingCandidateInput): Promise<{ eventId: string }>;
  dismissCandidate(candidateId: string): Promise<void>;
  exportConfirmedHistory(): Promise<{ fileName: string }>;
}