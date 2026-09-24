export type RbinExceptionColumnOption = { key: string; label: string };
export type RbinException = {
  id: string;
  persNo: string;
  columnName: string;
  columnLabel: string;
  fixedValue: string;
  updatedAt: string;
  updatedBy: string;
};
export type RbinExceptionRuleInput = { columnName: string; fixedValue: string };
export type RbinExceptionPage = {
  items: RbinException[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  columns: RbinExceptionColumnOption[];
};
export interface RbinExceptionsClient {
  list(search: string, filter: string, page: number, pageSize: number): Promise<RbinExceptionPage>;
  create(persNo: string, rules: RbinExceptionRuleInput[]): Promise<RbinException[]>;
  update(id: string, input: { persNo: string } & RbinExceptionRuleInput): Promise<RbinException>;
  delete(id: string): Promise<void>;
}