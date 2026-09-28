"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasErrors = exports.emptyValues = exports.columnsFor = exports.poolColumns = void 0;
exports.poolColumns = [
    'pers_no',
    'employee_name',
    'ps_group',
    'department',
    'department_feb',
    'range',
    'pool',
    'gender',
    'start_date',
    'end_date',
    'active_passive',
];
const columnsFor = (kind) => kind === 'development'
    ? [
        'pers_no',
        'employee_name',
        'ps_group',
        'department',
        'department_feb',
        'range',
        'pool',
        'start_date',
        'end_date',
    ]
    : [
        'pers_no',
        'employee_name',
        'ps_group',
        'department',
        'range',
        'pool',
        'gender',
        'start_date',
        'end_date',
        'active_passive',
    ];
exports.columnsFor = columnsFor;
const emptyValues = () => Object.fromEntries(exports.poolColumns.map((key) => [key, '']));
exports.emptyValues = emptyValues;
const hasErrors = (issues) => issues.some((issue) => issue.severity === 'error');
exports.hasErrors = hasErrors;
//# sourceMappingURL=pool-register.types.js.map