"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasBlockingEmployeeJdIssues = exports.employeeJdColumns = void 0;
exports.employeeJdColumns = ['pers_no', 'jd_id'];
const hasBlockingEmployeeJdIssues = (issues) => issues.some((issue) => issue.severity !== 'warning');
exports.hasBlockingEmployeeJdIssues = hasBlockingEmployeeJdIssues;
//# sourceMappingURL=employee-jd-import.types.js.map