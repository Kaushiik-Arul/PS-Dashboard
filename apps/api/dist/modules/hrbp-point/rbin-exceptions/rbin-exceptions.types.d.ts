import type { RbinExceptionColumn } from '../namelist-import/namelist-import.types';
export declare const rbinExceptionColumnLabels: Readonly<Record<RbinExceptionColumn, string>>;
export type RbinExceptionColumnOption = {
    key: RbinExceptionColumn;
    label: string;
};
export type RbinException = {
    id: string;
    persNo: string;
    columnName: RbinExceptionColumn;
    columnLabel: string;
    fixedValue: string;
    updatedAt: string;
    updatedBy: string;
};
export type RbinExceptionRuleInput = {
    columnName: RbinExceptionColumn;
    fixedValue: string;
};
export type RbinExceptionInput = {
    persNo: string;
    columnName: RbinExceptionColumn;
    fixedValue: string;
};
export type RbinExceptionPage = {
    items: RbinException[];
    total: number;
    page: number;
    pageSize: number;
    search: string;
    filter: string;
    columns: RbinExceptionColumnOption[];
};
