export const requiredOrgStructureColumns = [
  'role_title',
  'reporting_to',
  'jd_id',
  'career_level',
  'layer',
  'order_by',
  'is_active',
] as const;

export const optionalOrgStructureColumns = ['grade', 'function'] as const;
export const orgStructureColumns = [...requiredOrgStructureColumns, ...optionalOrgStructureColumns] as const;

export type OrgStructureColumn = (typeof orgStructureColumns)[number];
export type OrgStructureValues = Record<OrgStructureColumn, string>;
export type OrgStructurePreviewRow = { rowNumber: number; values: OrgStructureValues };
export type OrgStructureFile = { originalname: string; buffer: Buffer };