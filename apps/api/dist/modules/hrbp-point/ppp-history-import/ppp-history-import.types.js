"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pppImportColumns = exports.pppMetricColumns = exports.pppContextColumns = void 0;
exports.pppContextColumns = [
    'pers_no',
    'personnel_number',
    'employee_subgroup',
    'ps_group',
    'organizational_unit',
    'range',
    'function',
];
exports.pppMetricColumns = [
    'performance_current', 'position_current', 'person_current', 'tcl_current',
    'performance_previous', 'position_previous', 'person_previous', 'tcl_previous',
    'performance_oldest', 'position_oldest', 'person_oldest', 'tcl_oldest',
];
exports.pppImportColumns = [...exports.pppContextColumns, ...exports.pppMetricColumns];
//# sourceMappingURL=ppp-history-import.types.js.map