"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPsExitReason = classifyPsExitReason;
exports.parsePsExitFile = parsePsExitFile;
exports.validatePsExitRows = validatePsExitRows;
const attrition_import_parser_1 = require("../attrition-import/attrition-import.parser");
const reasonClassifications = new Map([
    ['resignation', 'resignation'],
    ['immediate termination', 'resignation'],
    ['dismissal performance issue', 'resignation'],
    ['retirement', 'retirement'],
    ['death not related to work', 'retirement'],
    ['intra bosch transfer', 'out_of_ps_transfer'],
]);
function normalizedReason(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function classifyPsExitReason(value) {
    return reasonClassifications.get(normalizedReason(value)) ?? null;
}
async function parsePsExitFile(file) {
    return (0, attrition_import_parser_1.parseAttritionFile)(file);
}
function validatePsExitRows(rows, rangeMappings) {
    const validated = (0, attrition_import_parser_1.validateAttritionRows)(rows, rangeMappings).map((row) => {
        const issues = row.issues
            .filter((issue) => issue.code !== 'duplicate')
            .map((issue) => issue.column === 'lwd_raw'
            ? { ...issue, severity: 'error' }
            : issue);
        if (!row.values.lwd_raw) {
            issues.push({ column: 'lwd_raw', code: 'required', message: 'LWD is required.', severity: 'error' });
        }
        const classification = classifyPsExitReason(row.values.reason_for_action);
        if (!classification) {
            issues.push({
                column: 'reason_for_action',
                code: row.values.reason_for_action ? 'unknown_reason' : 'required',
                message: row.values.reason_for_action
                    ? 'Use Resignation, Immediate termination, Dismissal - performance issue, Retirement, Death not related to work, or Intra-Bosch-Transfer.'
                    : 'Reason for Action is required.',
                severity: 'error',
            });
        }
        return { ...row, issues, classification };
    });
    const occurrences = new Map();
    for (const row of validated) {
        if (!row.values.pers_no || !row.lwd)
            continue;
        const key = `${row.values.pers_no}:${row.lwd.slice(0, 7)}`;
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    }
    for (const row of validated) {
        const count = occurrences.get(`${row.values.pers_no}:${row.lwd.slice(0, 7)}`) ?? 0;
        if (count > 1)
            row.issues.push({
                column: 'pers_no',
                code: 'duplicate',
                message: `This employee has ${count} exit rows in the same LWD month.`,
                severity: 'error',
                occurrences: count,
            });
    }
    return validated;
}
//# sourceMappingURL=ps-exit-import.parser.js.map