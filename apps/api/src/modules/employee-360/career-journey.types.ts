export type CareerJourneyEvent = {
  id: string;
  persNo: string;
  eventMonth: string;
  eventType: 'entry_to_ps' | 'internal_ps_change' | 'manual';
  oldOrganisationalAreaPa: string | null;
  newOrganisationalAreaPa: string | null;
  oldOrganizationalUnit: string | null;
  newOrganizationalUnit: string | null;
  oldPsGroup: string | null;
  newPsGroup: string | null;
  source: 'rbin' | 'manual';
  notes: string | null;
  isReviewed: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type CareerJourneyInput = Pick<CareerJourneyEvent,
  'eventMonth' | 'oldOrganisationalAreaPa' | 'newOrganisationalAreaPa'
  | 'oldOrganizationalUnit' | 'newOrganizationalUnit' | 'oldPsGroup' | 'newPsGroup' | 'notes'>;