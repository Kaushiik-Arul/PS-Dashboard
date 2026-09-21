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
var HrbpPointService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrbpPointService = void 0;
const common_1 = require("@nestjs/common");
const employee_status_dto_1 = require("./dto/employee-status.dto");
const hrbp_point_repository_1 = require("./hrbp-point.repository");
let HrbpPointService = HrbpPointService_1 = class HrbpPointService {
    repository;
    logger = new common_1.Logger(HrbpPointService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async getEmployeeStatuses() {
        return this.runDatabaseOperation(() => this.repository.getEmployeeStatuses(), 'Unable to load employee statuses');
    }
    async createEmployeeStatus(input, actorAccountId) {
        const persNo = this.validatePersNo(input?.persNo);
        const values = this.validateValues(input, actorAccountId);
        return this.runDatabaseOperation(async () => {
            if (!(await this.repository.employeeExists(persNo))) {
                throw new common_1.NotFoundException('Employee number was not found');
            }
            const created = await this.repository.createEmployeeStatus(persNo, values);
            if (!created) {
                throw new common_1.ConflictException('Employee status already exists');
            }
            return created;
        }, 'Unable to create employee status');
    }
    async updateEmployeeStatus(persNoInput, input, actorAccountId) {
        const persNo = this.validatePersNo(persNoInput);
        const values = this.validateValues(input, actorAccountId);
        return this.runDatabaseOperation(async () => {
            const updated = await this.repository.updateEmployeeStatus(persNo, values);
            if (!updated) {
                throw new common_1.NotFoundException('Employee status was not found');
            }
            return updated;
        }, 'Unable to update employee status');
    }
    async deleteEmployeeStatus(persNoInput) {
        const persNo = this.validatePersNo(persNoInput);
        await this.runDatabaseOperation(async () => {
            if (!(await this.repository.deleteEmployeeStatus(persNo))) {
                throw new common_1.NotFoundException('Employee status was not found');
            }
        }, 'Unable to delete employee status');
    }
    validatePersNo(value) {
        if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
            throw new common_1.BadRequestException('Employee number must be a positive whole number');
        }
        return value;
    }
    validateValues(input, actorAccountId) {
        if (!input || !employee_status_dto_1.employeeStatusTypes.includes(input.statusType)) {
            throw new common_1.BadRequestException('Status type is invalid');
        }
        const startDate = this.validateDate(input.startDate, 'Start date');
        const endDate = this.validateDate(input.endDate, 'End date');
        if (endDate && (!startDate || endDate < startDate)) {
            throw new common_1.BadRequestException('End date must be on or after the start date');
        }
        return {
            statusType: input.statusType,
            startDate,
            endDate,
            updatedBy: actorAccountId,
        };
    }
    validateDate(value, label) {
        if (value === undefined || value === null || value === '')
            return null;
        const parsedDate = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : null;
        if (typeof value !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            !parsedDate ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== value) {
            throw new common_1.BadRequestException(`${label} is invalid`);
        }
        return value;
    }
    async runDatabaseOperation(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.HrbpPointService = HrbpPointService;
exports.HrbpPointService = HrbpPointService = HrbpPointService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [hrbp_point_repository_1.HrbpPointRepository])
], HrbpPointService);
//# sourceMappingURL=hrbp-point.service.js.map