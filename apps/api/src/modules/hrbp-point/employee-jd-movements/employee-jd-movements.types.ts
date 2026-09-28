export type EmployeeJdMovement = {
  id: string;
  persNo: string;
  employeeName: string | null;
  effectiveDate: string;
  oldJdId: string | null;
  oldRoleTitle: string | null;
  newJdId: string | null;
  newRoleTitle: string | null;
  source: 'upload' | 'manual';
  changedBy: string;
  occurredAt: string;
};

export type EmployeeJdMovementPage = {
  items: EmployeeJdMovement[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmployeeJdMovementFilters = {
  search: string;
  source: '' | 'upload' | 'manual';
  fromDate: string | null;
  toDate: string | null;
  role: string;
};