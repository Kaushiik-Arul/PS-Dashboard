export type OrgStructureRow = {
  id: string;
  sourceRowNumber: number;
  roleTitle: string;
  reportingTo: string;
  jdId: string;
  careerLevel: string;
  layer: string;
  grade: string;
  function: string;
  orderBy: number | null;
  isActive: boolean;
  importedAt: string;
};