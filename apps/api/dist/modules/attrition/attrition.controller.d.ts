import type { AuthenticatedUser } from '../auth/auth.types';
import { AttritionService } from './attrition.service';
import { AttritionFilterDto } from './dto/attrition-filter.dto';
export declare class AttritionController {
    private readonly service;
    constructor(service: AttritionService);
    getFilterOptions(filters: AttritionFilterDto, user: AuthenticatedUser): Promise<{
        year: string[];
        separationType: ("Resignation" | "Transfer" | "Retirement" | "Other")[];
        range: string[];
        orgUnit: string[];
    }>;
    getDashboard(filters: AttritionFilterDto, user: AuthenticatedUser): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        selectedYear: number;
        organizationScope: string;
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
        filterOptions: {
            year: string[];
            separationType: ("Resignation" | "Transfer" | "Retirement" | "Other")[];
            range: string[];
            orgUnit: string[];
        };
        kpis: {
            total: number;
            resignations: number;
            transfers: number;
            retirements: number;
            female: number;
            averageHeadcount: number | null;
            attritionRate: number | null;
        };
        trend: {
            month: number;
            count: number;
            headcount: number | null;
            rate: number | null;
        }[];
        reasons: {
            label: string;
            value: number;
        }[];
    }>;
}
