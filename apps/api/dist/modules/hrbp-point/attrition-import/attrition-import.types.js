"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyAttritionValues = exports.attritionColumns = void 0;
exports.attritionColumns = [
    'pers_no',
    'employee_name',
    'ps_group',
    'gender_key',
    'filter_value',
    'reason_for_action',
    'detailed_reason_approved',
    'org_unit',
    'range',
    'initiated_date_raw',
    'lwd_raw',
    'e_separation_request_no',
    'to_org_unit',
];
const emptyAttritionValues = () => Object.fromEntries(exports.attritionColumns.map((column) => [column, '']));
exports.emptyAttritionValues = emptyAttritionValues;
//# sourceMappingURL=attrition-import.types.js.map