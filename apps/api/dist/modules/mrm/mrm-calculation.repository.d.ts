import { DatabaseService } from '../../database/database.service';
import type { MrmSourceStatus } from './mrm.types';
export type MrmEmployeeSourceRow = {
    range: string;
    org_unit: string;
    direct_or_indirect: string;
    employee_group: string;
    ps_group: string;
    gender_key: string;
    joined_in_month: boolean;
};
export type MrmAttritionSourceRow = {
    range: string;
    org_unit: string;
    filter_value: string;
    reason_for_action: string;
};
export declare class MrmCalculationRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getSourceStatus(dataMonth: string): Promise<MrmSourceStatus>;
    getEmployees(dataMonth: string, accountId: string, source: 'live' | 'history'): Promise<MrmEmployeeSourceRow[]>;
    getAttrition(dataMonth: string, accountId: string): Promise<MrmAttritionSourceRow[]>;
}
