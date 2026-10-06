import type { AuthenticatedUser } from '../auth/auth.types';
import { SuccessionPlanningFilterDto } from './dto/succession-planning-filter.dto';
import { SuccessionPlanningService } from './succession-planning.service';
export declare class SuccessionPlanningController {
    private readonly service;
    constructor(service: SuccessionPlanningService);
    getHistoryState(): Promise<{
        snapshotMonths: string[];
    }>;
    getSnapshot(reportingMonth: string): Promise<unknown>;
    publishSnapshot(reportingMonth: unknown, user: AuthenticatedUser): Promise<{
        reportingMonth: string;
    }>;
    getRegister(filters: SuccessionPlanningFilterDto, user: AuthenticatedUser): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        rows: {
            entity: string;
            jd_name: string;
            employee_subgroup: string;
            updated_by_name: string;
            area: string;
            position_jd_id: string;
            ipe_level: string;
            criticality: string;
            priority: string;
            incumbent_pers_no: string;
            incumbent_name: string;
            incumbent_org_unit: string;
            incumbent_range: string;
            incumbent_tenure_years: string;
            incumbent_age: string;
            incumbent_change_year: string;
            incumbent_9_box_rating: string;
            reason_for_change: string;
            successor1_pers_no: string;
            successor1_name: string;
            successor1_dept_code: string;
            successor1_current_jd_id: string;
            successor1_readiness: string;
            successor1_9_box_rating: string;
            successor1_idp_status: string;
            successor2_pers_no: string;
            successor2_name: string;
            successor2_dept_code: string;
            successor2_current_jd_id: string;
            successor2_readiness: string;
            successor2_9_box_rating: string;
            successor2_idp_status: string;
            id: string;
        }[];
        filterOptions: {
            [k: string]: string[];
        };
    }>;
}
