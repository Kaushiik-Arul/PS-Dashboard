export const orgStructureColumns = [
  ['role_title', 'Role Title'],
  ['reporting_to', 'Reporting To'],
  ['jd_id', 'JD ID'],
  ['career_level', 'Career Level'],
  ['layer', 'Layer'],
  ['order_by', 'Order By'],
  ['is_active', 'Is Active'],
  ['grade', 'Grade'],
  ['function', 'Function'],
] as const;

export type OrgStructureColumn = (typeof orgStructureColumns)[number][0];
export type OrgStructureValues = Record<OrgStructureColumn, string>;
export type OrgStructurePreviewRow = { rowNumber: number; values: OrgStructureValues };
export type OrgStructurePreview = {
  id: string;
  fileName: string;
  totalRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: OrgStructurePreviewRow[];
};