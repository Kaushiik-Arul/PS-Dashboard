export const rbinMappingKinds = ['ranges', 'functions'] as const;
export type RbinMappingKind = (typeof rbinMappingKinds)[number];

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