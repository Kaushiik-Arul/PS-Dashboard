import { DatabaseService } from '../../database/database.service';
import type { AttritionFilterDto } from './dto/attrition-filter.dto';
export declare class AttritionService {
    private readonly database;
    constructor(database: DatabaseService);
    getDashboard(accountId: string, input?: AttritionFilterDto): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        selectedYears: number[];
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
            reasonForAction: string[];
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
    getFilterOptions(accountId: string, input?: AttritionFilterDto): Promise<{
        year: string[];
        separationType: ("Resignation" | "Transfer" | "Retirement" | "Other")[];
        reasonForAction: string[];
        range: string[];
        orgUnit: string[];
    }>;
    private buildFilterOptions;
    private matches;
    private getMonthlyHeadcount;
    private normalizeFilters;
}
