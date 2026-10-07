"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
exports.hasPermission = hasPermission;
exports.permissions = [
    'workforce:view',
    'dashboard-history:view',
    'succession-planning:view',
    'succession-planning:import',
    'hrbp-point:view',
    'hrbp-point:manage',
    'headcount:import',
    'namelist:import',
    'namelist:transform',
    'namelist:export',
    'access-point:manage',
    'workforce:edit',
    'workforce:export',
];
const rolePermissions = {
    hrbp: new Set(exports.permissions),
    admin: new Set(['workforce:view', 'succession-planning:view']),
    range_head: new Set(['workforce:view', 'succession-planning:view']),
    department_head: new Set(['workforce:view', 'succession-planning:view']),
    sub_department_head: new Set(['workforce:view', 'succession-planning:view']),
};
function hasPermission(roles, permission) {
    return roles.some((role) => rolePermissions[role].has(permission));
}
//# sourceMappingURL=permissions.js.map