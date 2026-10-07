import { DatabaseService } from '../../database/database.service';
import type { AttritionFilterDto } from './dto/attrition-filter.dto';
type AttritionRecord = {
    id: string;
    pers_no: string;
    employee_name: string;
    ps_group: string;
    gender_key: string;
    filter_value: string;
    reason_for_action: string;
    detailed_reason_approved: string;
    org_unit: string;
    range: string;
    initiated_date: string;
    lwd: string;
    e_separation_request_no: string;
    to_org_unit: string;
};
export declare class AttritionService {
    private readonly database;
    constructor(database: DatabaseService);
    getRegister(accountId: string, input?: AttritionFilterDto): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        rows: AttritionRecord[];
        filterOptions: Record<"range" | "orgUnit" | "gender", string[]>;
    }>;
    getFilterOptions(accountId: string, input?: AttritionFilterDto): Promise<Record<"range" | "orgUnit" | "gender", string[]>>;
    private normalizeFilters;
}
export {};
