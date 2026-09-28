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
exports.EmployeeJdMovementsService = void 0;
const common_1 = require("@nestjs/common");
const employee_jd_movements_repository_1 = require("./employee-jd-movements.repository");
let EmployeeJdMovementsService = class EmployeeJdMovementsService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    list(search, source, fromDate, toDate, role, pageInput, pageSizeInput) {
        const normalizedSource = source?.trim() ?? '';
        if (normalizedSource !== '' && normalizedSource !== 'upload' && normalizedSource !== 'manual') {
            throw new common_1.BadRequestException('Source must be upload or manual.');
        }
        const normalizedSearch = search?.trim() ?? '';
        const normalizedRole = role?.trim() ?? '';
        if (normalizedSearch.length > 100 || normalizedRole.length > 200) {
            throw new common_1.BadRequestException('Movement filters are too long.');
        }
        const normalizedFrom = this.date(fromDate, 'From date');
        const normalizedTo = this.date(toDate, 'To date');
        if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
            throw new common_1.BadRequestException('From date must be on or before To date.');
        }
        return this.repository.list({
            search: normalizedSearch,
            source: normalizedSource,
            fromDate: normalizedFrom,
            toDate: normalizedTo,
            role: normalizedRole,
        }, this.positiveInteger(pageInput, 1, 1_000_000), this.positiveInteger(pageSizeInput, 25, 100));
    }
    date(value, label) {
        if (!value)
            return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            throw new common_1.BadRequestException(`${label} is invalid.`);
        const parsed = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
            throw new common_1.BadRequestException(`${label} is invalid.`);
        }
        return value;
    }
    positiveInteger(value, fallback, maximum) {
        if (value === undefined)
            return fallback;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException('Pagination values must be positive whole numbers.');
        const parsed = Number(value);
        if (parsed < 1 || parsed > maximum)
            throw new common_1.BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
        return parsed;
    }
};
exports.EmployeeJdMovementsService = EmployeeJdMovementsService;
exports.EmployeeJdMovementsService = EmployeeJdMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employee_jd_movements_repository_1.EmployeeJdMovementsRepository])
], EmployeeJdMovementsService);
//# sourceMappingURL=employee-jd-movements.service.js.map