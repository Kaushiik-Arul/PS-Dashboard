"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptySuccessionPlanningValues = exports.successionPlanningColumns = void 0;
exports.successionPlanningColumns = [
    'entity',
    'updated_by_name',
    'area',
    'position_jd_id',
    'jd_name',
    'ipe_level',
    'employee_subgroup',
    'criticality',
    'priority',
    'incumbent_pers_no',
    'incumbent_name',
    'incumbent_org_unit',
    'incumbent_range',
    'incumbent_tenure_years',
    'incumbent_age',
    'incumbent_change_year',
    'incumbent_9_box_rating',
    'reason_for_change',
    'successor1_pers_no',
    'successor1_name',
    'successor1_dept_code',
    'successor1_current_jd_id',
    'successor1_readiness',
    'successor1_9_box_rating',
    'successor1_idp_status',
    'successor2_pers_no',
    'successor2_name',
    'successor2_dept_code',
    'successor2_current_jd_id',
    'successor2_readiness',
    'successor2_9_box_rating',
    'successor2_idp_status',
];
const emptySuccessionPlanningValues = () => Object.fromEntries(exports.successionPlanningColumns.map((column) => [column, '']));
exports.emptySuccessionPlanningValues = emptySuccessionPlanningValues;
//# sourceMappingURL=succession-planning-import.types.js.map