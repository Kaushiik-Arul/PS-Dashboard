"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.separationTypes = void 0;
exports.normalizedKey = normalizedKey;
exports.classifySeparation = classifySeparation;
exports.separationTypes = [
    'Resignation',
    'Transfer',
    'Retirement',
    'Other',
];
function normalizedKey(value) {
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
function classifySeparation(row) {
    const source = `${row.filter_value} ${row.reason_for_action}`.toLowerCase();
    if (/retir/.test(source))
        return 'Retirement';
    if (/transfer/.test(source))
        return 'Transfer';
    if (/resign|separation|exit/.test(source))
        return 'Resignation';
    return 'Other';
}
//# sourceMappingURL=attrition-classification.js.map