"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MrmCalculationService = void 0;
const common_1 = require("@nestjs/common");
const attrition_classification_1 = require("../attrition/attrition-classification");
const mrm_calculation_repository_1 = require("./mrm-calculation.repository");
const indirectRanges = new Set(['BIDP', 'NAP', 'JAP', 'GANP']);
const sulGrades = new Set(['GROUP1', 'GROUP2', 'SL2', 'SL3', 'SL4']);
let MrmCalculationService = class MrmCalculationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getSourceStatus(dataMonth, executor) {
        return this.repository.getSourceStatus(dataMonth, executor);
    }
    async calculate(dataMonth, accountId, executor) {
        const sourceStatus = await this.repository.getSourceStatus(dataMonth, executor);
        if (!sourceStatus.available || !sourceStatus.source) {
            return { sourceStatus, buckets: [] };
        }
        if (sourceStatus.source === 'snapshot') {
            return {
                sourceStatus,
                buckets: await this.repository.getSnapshotBuckets(dataMonth, accountId, executor),
            };
        }
        const [employees, attrition] = await Promise.all([
            this.repository.getEmployees(dataMonth, accountId, sourceStatus.source, executor),
            this.repository.getAttrition(dataMonth, accountId, executor),
        ]);
        return {
            sourceStatus,
            buckets: this.buildBuckets(dataMonth, employees, attrition),
        };
    }
    async archiveMonth(dataMonth, accountId, executor) {
        const calculation = await this.calculate(dataMonth, accountId, executor);
        if (!calculation.sourceStatus.available || calculation.sourceStatus.source === 'snapshot') {
            throw new Error('MRM_SOURCE_MONTH_UNAVAILABLE');
        }
        await this.repository.replaceMonthlySnapshot(dataMonth, accountId, calculation.buckets, executor);
    }
    buildBuckets(dataMonth, employees, attrition) {
        const buckets = new Map();
        const add = (metricKey, range, orgUnit, numerator = 1, denominator = null, qualityCount = 0) => {
            const rangeKey = (0, attrition_classification_1.normalizedKey)(range);
            const orgUnitKey = (0, attrition_classification_1.normalizedKey)(orgUnit);
            const id = `${metricKey}\0${rangeKey}\0${orgUnitKey}`;
            const bucket = buckets.get(id) ?? {
                dataMonth,
                metricKey,
                rangeKey,
                orgUnitKey,
                numerator: 0,
                denominator: denominator === null ? null : 0,
                qualityCount: 0,
            };
            bucket.numerator += numerator;
            if (denominator !== null)
                bucket.denominator = (bucket.denominator ?? 0) + denominator;
            bucket.qualityCount += qualityCount;
            buckets.set(id, bucket);
        };
        employees.forEach((employee) => {
            const direct = (0, attrition_classification_1.normalizedKey)(employee.direct_or_indirect);
            const range = (0, attrition_classification_1.normalizedKey)(employee.range);
            const grade = (0, attrition_classification_1.normalizedKey)(employee.ps_group);
            const gender = (0, attrition_classification_1.normalizedKey)(employee.gender_key);
            const isMss = direct === 'D' || direct === 'I';
            if (direct === 'D')
                add('direct-mss', employee.range, employee.org_unit);
            if (isMss)
                add('total-mss', employee.range, employee.org_unit);
            if (direct === 'I' && indirectRanges.has(range)) {
                add('indirect-mss', employee.range, employee.org_unit);
            }
            if ((0, attrition_classification_1.normalizedKey)(employee.employee_group) === 'INBOUND') {
                add('expat', employee.range, employee.org_unit);
            }
            if (sulGrades.has(grade))
                add('sul', employee.range, employee.org_unit);
            if (sulGrades.has(grade) && gender === 'FEMALE') {
                add('women-slx', employee.range, employee.org_unit);
            }
            if (isMss) {
                add('women-hc', employee.range, employee.org_unit, gender === 'FEMALE' ? 1 : 0, 1);
            }
            if (employee.joined_in_month) {
                const recognized = gender === 'FEMALE' || gender === 'MALE';
                add('gender-hiring', employee.range, employee.org_unit, gender === 'FEMALE' ? 1 : 0, recognized ? 1 : 0, recognized ? 0 : 1);
            }
        });
        attrition.forEach((row) => {
            const separation = (0, attrition_classification_1.classifySeparation)(row);
            const reason = (0, attrition_classification_1.normalizedKey)(row.reason_for_action);
            if (separation === 'Resignation'
                || separation === 'Retirement'
                || reason === 'TRANSFER INTRA ENTITY')
                add('attrition', row.range, row.org_unit);
            if (reason === 'TRANSFER INTRA BOSCH') {
                add('rotation', row.range, row.org_unit);
            }
            if (reason === 'INTERNAL')
                add('transfer', row.range, row.org_unit);
        });
        return [...buckets.values()];
    }
};
exports.MrmCalculationService = MrmCalculationService;
exports.MrmCalculationService = MrmCalculationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mrm_calculation_repository_1.MrmCalculationRepository])
], MrmCalculationService);
//# sourceMappingURL=mrm-calculation.service.js.map