export type RbinMappingKind = "ranges" | "functions";

export type RbinMapping = {
  id: string;
  organizationalUnit: string;
  value: string;
  sourceFileName: string;
  updatedAt: string;
};

export type RbinMappingPage = {
  items: RbinMapping[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  filterOptions: string[];
};

export type RbinMappingInput = {
  organizationalUnit: string;
  value: string;
};

export interface RbinMappingsClient {
  list(kind: RbinMappingKind, search: string, filter: string, page: number, pageSize: number): Promise<RbinMappingPage>;
  create(kind: RbinMappingKind, input: RbinMappingInput): Promise<RbinMapping>;
  update(kind: RbinMappingKind, id: string, input: RbinMappingInput): Promise<RbinMapping>;
  delete(kind: RbinMappingKind, id: string): Promise<void>;
}