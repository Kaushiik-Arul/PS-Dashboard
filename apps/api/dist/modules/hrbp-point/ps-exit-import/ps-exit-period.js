"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.psExitPeriod = psExitPeriod;
exports.isPsExitRowSelected = isPsExitRowSelected;
exports.psExitSelectablePeriods = psExitSelectablePeriods;
const periodPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
function isoDate(date) {
    return date.toISOString().slice(0, 10);
}
function psExitPeriod(period) {
    const match = periodPattern.exec(period);
    if (!match)
        return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const carryoverDate = isoDate(new Date(Date.UTC(year, monthIndex, 0)));
    const excludedMonthEndDate = isoDate(new Date(Date.UTC(year, monthIndex + 1, 0)));
    return {
        period,
        periodStart: `${period}-01`,
        carryoverDate,
        carryoverPeriod: carryoverDate.slice(0, 7),
        excludedMonthEndDate,
    };
}
function isPsExitRowSelected(row, period) {
    const selection = psExitPeriod(period);
    return !!selection && (row.lwd === selection.carryoverDate
        || (row.lwd.startsWith(period) && row.lwd !== selection.excludedMonthEndDate));
}
function psExitSelectablePeriods(rows) {
    const periods = new Set();
    for (const row of rows) {
        if (!row.lwd)
            continue;
        const date = new Date(`${row.lwd}T00:00:00Z`);
        const nextDay = new Date(date.getTime() + 86_400_000);
        if (nextDay.getUTCMonth() !== date.getUTCMonth())
            periods.add(isoDate(nextDay).slice(0, 7));
        else
            periods.add(row.lwd.slice(0, 7));
    }
    return [...periods].sort();
}
//# sourceMappingURL=ps-exit-period.js.map