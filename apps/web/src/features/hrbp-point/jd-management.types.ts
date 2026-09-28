export type JobDescription = { id: string; jdId: string; roleTitle: string; updatedAt: string };
export type JobDescriptionInput = { jdId: string; roleTitle: string };
export type JobDescriptionPage = { items: JobDescription[]; total: number; page: number; pageSize: number; search: string };

export type EmployeeJdIssue = { column: 'pers_no' | 'jd_id'; message: string; severity?: 'warning' };
export type EmployeeJdPreviewRow = { rowNumber: number; values: { pers_no: string; jd_id: string }; issues: EmployeeJdIssue[] };
export type EmployeeJdPreview = {
  id: string; fileName: string; totalRows: number; validRows: number; invalidRows: number; warningRows: number;
  hasExistingAssignments: boolean; rows: EmployeeJdPreviewRow[]; page: number; pageSize: number; filteredRows: number;
};
export type EmployeeJdPreviewFilter = 'all' | 'valid' | 'warning' | 'invalid';
