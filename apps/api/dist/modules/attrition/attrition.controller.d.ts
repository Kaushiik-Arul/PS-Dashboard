import type { AuthenticatedUser } from '../auth/auth.types';
import { AttritionService } from './attrition.service';
import { AttritionFilterDto } from './dto/attrition-filter.dto';
export declare class AttritionController {
    private readonly service;
    constructor(service: AttritionService);
    getFilterOptions(filters: AttritionFilterDto, user: AuthenticatedUser): Promise<Record<"range" | "orgUnit" | "gender", string[]>>;
    getRegister(filters: AttritionFilterDto, user: AuthenticatedUser): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        rows: {
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
        }[];
        filterOptions: Record<"range" | "orgUnit" | "gender", string[]>;
    }>;
}
