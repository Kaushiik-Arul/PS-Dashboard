"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCareerEvents = detectCareerEvents;
function normalized(value) {
    return value.trim().toLowerCase();
}
function validPersNo(value) {
    if (!/^[1-9]\d{0,18}$/.test(value))
        return false;
    return BigInt(value) <= 9223372036854775807n;
}
function uniqueEmployees(rows) {
    const counts = new Map();
    rows.forEach((row) => {
        const persNo = row.values.pers_no.trim();
        if (validPersNo(persNo))
            counts.set(persNo, (counts.get(persNo) ?? 0) + 1);
    });
    return new Map(rows.flatMap((row) => {
        const persNo = row.values.pers_no.trim();
        return validPersNo(persNo) && counts.get(persNo) === 1 ? [[persNo, row.values]] : [];
    }));
}
function detectCareerEvents(previousRows, currentRows) {
    const previous = uniqueEmployees(previousRows);
    const current = uniqueEmployees(currentRows);
    const events = [];
    current.forEach((next, persNo) => {
        const prior = previous.get(persNo);
        if (!prior)
            return;
        const oldArea = normalized(prior.organisational_area_pa);
        const newArea = normalized(next.organisational_area_pa);
        const enteredPs = oldArea !== 'ps' && newArea === 'ps';
        const changedWithinPs = oldArea === 'ps' && newArea === 'ps' && (normalized(prior.organizational_unit) !== normalized(next.organizational_unit)
            || normalized(prior.ps_group) !== normalized(next.ps_group));
        if (!enteredPs && !changedWithinPs)
            return;
        events.push({
            persNo,
            eventType: enteredPs ? 'entry_to_ps' : 'internal_ps_change',
            oldOrganisationalAreaPa: prior.organisational_area_pa.trim(),
            newOrganisationalAreaPa: next.organisational_area_pa.trim(),
            oldOrganizationalUnit: prior.organizational_unit.trim(),
            newOrganizationalUnit: next.organizational_unit.trim(),
            oldPsGroup: prior.ps_group.trim(),
            newPsGroup: next.ps_group.trim(),
        });
    });
    return events.sort((left, right) => left.persNo.localeCompare(right.persNo));
}
//# sourceMappingURL=rbin-career-detector.js.map