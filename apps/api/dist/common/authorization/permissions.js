"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
exports.hasPermission = hasPermission;
exports.permissions = [
    'workforce:view',
    'hrbp-point:view',
    'hrbp-point:manage',
    'access-point:manage',
    'workforce:edit',
    'workforce:export',
];
const rolePermissions = {
    hrbp: new Set(exports.permissions),
    admin: new Set(['workforce:view']),
    range_head: new Set(['workforce:view']),
    department_head: new Set(['workforce:view']),
    sub_department_head: new Set(['workforce:view']),
};
function hasPermission(roles, permission) {
    return roles.some((role) => rolePermissions[role].has(permission));
}
//# sourceMappingURL=permissions.js.map