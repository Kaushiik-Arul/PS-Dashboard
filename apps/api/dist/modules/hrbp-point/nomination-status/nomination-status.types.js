"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasNominationStatusErrors = exports.emptyNominationStatusValues = exports.nominationStatusColumns = void 0;
exports.nominationStatusColumns = [
    'year',
    'corp_plant',
    'range',
    'department',
    'employee_no',
    'employee_name',
    'talent_pool',
    'result',
    'admission',
];
const emptyNominationStatusValues = () => Object.fromEntries(exports.nominationStatusColumns.map((column) => [column, '']));
exports.emptyNominationStatusValues = emptyNominationStatusValues;
const hasNominationStatusErrors = (issues) => issues.length > 0;
exports.hasNominationStatusErrors = hasNominationStatusErrors;
//# sourceMappingURL=nomination-status.types.js.map