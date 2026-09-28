export const stepColumns = [
  ['sl_no', 'Sl No'], ['year', 'Year'], ['pers_no', 'E No'], ['e_name', 'E Name'],
  ['grp', 'Group'], ['initiated_by', 'Initiated by (HRBP)'], ['exchanged_with', 'Exchanged with'],
  ['step_from', 'STEP From'], ['step_to', 'STEP To'], ['entity_from', 'Entity From'], ['entity_to', 'Entity To'],
  ['gb_from', 'GB From'], ['gb_to', 'GB To'], ['function_from', 'Function From'], ['function_to', 'Function To'],
  ['dept_from', 'Dept From'], ['dept_to', 'Dept To'], ['location_from', 'Location From'], ['location_to', 'Location To'],
] as const;
export type StepColumn = (typeof stepColumns)[number][0];
export type StepPreviewRow = { rowNumber: number; values: Record<StepColumn, string>; issues: { column: StepColumn; message: string }[] };
export type StepPreview = {
  id: string; fileName: string; totalRows: number; validRows: number; invalidRows: number;
  existingRows: number; filteredRows: number; page: number;
  rows: StepPreviewRow[];
};
