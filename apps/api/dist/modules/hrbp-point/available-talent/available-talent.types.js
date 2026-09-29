"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasErrors = exports.emptyValues = exports.availableColumns = void 0;
exports.availableColumns = [
    'pers_no',
    'employee_name',
    'entity',
    'department',
    'hrbp',
    'preferences',
    'current_status',
    'comments',
    'jd_id',
];
const emptyValues = () => Object.fromEntries(exports.availableColumns.map((key) => [key, '']));
exports.emptyValues = emptyValues;
const hasErrors = (issues) => issues.some((issue) => issue.severity === 'error');
exports.hasErrors = hasErrors;
//# sourceMappingURL=available-talent.types.js.map