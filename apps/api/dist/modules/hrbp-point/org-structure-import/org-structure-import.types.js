"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgStructureColumns = exports.optionalOrgStructureColumns = exports.requiredOrgStructureColumns = void 0;
exports.requiredOrgStructureColumns = [
    'role_title',
    'reporting_to',
    'jd_id',
    'career_level',
    'layer',
    'order_by',
    'is_active',
];
exports.optionalOrgStructureColumns = ['grade', 'function'];
exports.orgStructureColumns = [...exports.requiredOrgStructureColumns, ...exports.optionalOrgStructureColumns];
//# sourceMappingURL=org-structure-import.types.js.map