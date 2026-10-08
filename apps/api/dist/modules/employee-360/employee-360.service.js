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
var Employee360Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Employee360Service = void 0;
const common_1 = require("@nestjs/common");
const employee_360_repository_1 = require("./employee-360.repository");
const career_journey_repository_1 = require("./career-journey.repository");
let Employee360Service = Employee360Service_1 = class Employee360Service {
    repository;
    careerJourneyRepository;
    logger = new common_1.Logger(Employee360Service_1.name);
    constructor(repository, careerJourneyRepository) {
        this.repository = repository;
        this.careerJourneyRepository = careerJourneyRepository;
    }
    getEmployees(input, user) {
        return this.repository.getEmployees(this.normalize(input), user.accountId, user.persNo);
    }
    async getProfile(persNoInput, user) {
        const persNo = this.persNo(persNoInput);
        const result = await this.repository.getEmployees(this.normalize({ search: persNo }), user.accountId, user.persNo);
        const employee = result.employees.find((item) => item.persNo === persNo);
        if (!employee)
            throw new common_1.NotFoundException('Employee was not found within your workforce scope.');
        const [careerJourney, pppHistory, stepOverview, idpStatus, talentPortfolio, developmentPortfolio, successionPortfolio] = await Promise.all([
            this.careerJourneyRepository.list(persNo),
            this.repository.getPppHistory(persNo),
            this.repository.getStepOverview(persNo),
            this.repository.getIdpStatus(persNo),
            this.repository.getTalentPortfolio(persNo),
            this.repository.getDevelopmentPortfolio(persNo),
            this.repository.getSuccessionPortfolio(persNo),
        ]);
        return { employee, careerJourney, pppHistory, stepOverview, idpStatus, talentPortfolio, developmentPortfolio, successionPortfolio };
    }
    async createCareerEvent(persNoInput, body, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const input = this.careerInput(body);
        return this.run(() => this.careerJourneyRepository.create(persNo, input, user.accountId));
    }
    async updateCareerEvent(persNoInput, idInput, body, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const id = this.uuid(idInput);
        return this.run(async () => {
            const event = await this.careerJourneyRepository.update(id, persNo, this.careerInput(body), user.accountId);
            if (!event)
                throw new common_1.NotFoundException('Career Journey event was not found.');
            return event;
        });
    }
    async deleteCareerEvent(persNoInput, idInput, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const id = this.uuid(idInput);
        await this.run(async () => {
            if (!(await this.careerJourneyRepository.delete(id, persNo, user.accountId))) {
                throw new common_1.NotFoundException('Career Journey event was not found.');
            }
        });
    }
    async updateJobDescription(persNoInput, body, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const input = this.jobDescriptionInput(body);
        return this.run(async () => {
            try {
                return await this.repository.updateJobDescription(persNo, input.jdId, input.effectiveDate, user.accountId);
            }
            catch (error) {
                if (error instanceof Error && error.message === 'JD_NOT_FOUND') {
                    throw new common_1.NotFoundException('Job description was not found.');
                }
                throw error;
            }
        });
    }
    async updateStepAvailability(persNoInput, body, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const input = this.stepAvailabilityInput(body);
        return this.run(() => this.repository.updateStepAvailability(persNo, input.available, input.preferences, input.comments, user.accountId), 'Unable to update STEP availability.');
    }
    async updateIdpStatus(persNoInput, body, user) {
        const persNo = await this.assertScopedEmployee(persNoInput, user);
        const input = this.idpStatusInput(body);
        return this.run(() => this.repository.updateIdpStatus(persNo, input.available, input.comments, user.accountId), 'Unable to update IDP status.');
    }
    async assertScopedEmployee(persNoInput, user) {
        const persNo = this.persNo(persNoInput);
        await this.getProfile(persNo, user);
        return persNo;
    }
    careerInput(body) {
        const keys = ['eventMonth', 'oldOrganisationalAreaPa', 'newOrganisationalAreaPa', 'oldOrganizationalUnit', 'newOrganizationalUnit', 'oldPsGroup', 'newPsGroup', 'notes'];
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new common_1.BadRequestException('Career Journey values are required.');
        const record = body;
        if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
            throw new common_1.BadRequestException(`Career Journey event must contain exactly ${keys.join(', ')}.`);
        }
        if (typeof record.eventMonth !== 'string' || !/^\d{4}-\d{2}-01$/.test(record.eventMonth)) {
            throw new common_1.BadRequestException('Event month must be the first day of a month in YYYY-MM-01 format.');
        }
        const date = new Date(`${record.eventMonth}T00:00:00Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.eventMonth) {
            throw new common_1.BadRequestException('Event month is invalid.');
        }
        const text = (key, maximum) => {
            const value = record[key];
            if (value === null || value === '')
                return null;
            if (typeof value !== 'string' || value.trim().length > maximum)
                throw new common_1.BadRequestException(`${key} is invalid.`);
            return value.trim() || null;
        };
        const input = {
            eventMonth: record.eventMonth,
            oldOrganisationalAreaPa: text('oldOrganisationalAreaPa', 500),
            newOrganisationalAreaPa: text('newOrganisationalAreaPa', 500),
            oldOrganizationalUnit: text('oldOrganizationalUnit', 500),
            newOrganizationalUnit: text('newOrganizationalUnit', 500),
            oldPsGroup: text('oldPsGroup', 500), newPsGroup: text('newPsGroup', 500),
            notes: text('notes', 1000),
        };
        if (!Object.entries(input).some(([key, value]) => key !== 'eventMonth' && value !== null)) {
            throw new common_1.BadRequestException('Provide at least one Career Journey value or note.');
        }
        return input;
    }
    jobDescriptionInput(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new common_1.BadRequestException('JD ID and effective date are required.');
        }
        const record = body;
        const keys = Object.keys(record);
        if (keys.length !== 2 || keys.some((key) => key !== 'jdId' && key !== 'effectiveDate')) {
            throw new common_1.BadRequestException('Job description update must contain JD ID and effective date.');
        }
        if (typeof record.jdId !== 'string' || !record.jdId.trim() || record.jdId.trim().length > 100) {
            throw new common_1.BadRequestException('JD ID is invalid.');
        }
        if (typeof record.effectiveDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.effectiveDate)) {
            throw new common_1.BadRequestException('Effective date must be in YYYY-MM-DD format.');
        }
        const date = new Date(`${record.effectiveDate}T00:00:00Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.effectiveDate) {
            throw new common_1.BadRequestException('Effective date is invalid.');
        }
        return { jdId: record.jdId.trim().toUpperCase(), effectiveDate: record.effectiveDate };
    }
    stepAvailabilityInput(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new common_1.BadRequestException('STEP availability values are required.');
        }
        const record = body;
        const keys = ['available', 'preferences', 'comments'];
        if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
            throw new common_1.BadRequestException('STEP availability must contain exactly available, preferences, and comments.');
        }
        if (typeof record.available !== 'boolean') {
            throw new common_1.BadRequestException('Availability must be Yes or No.');
        }
        const text = (key) => {
            const value = record[key];
            if (value === null || value === '')
                return null;
            if (typeof value !== 'string' || value.trim().length > 4000) {
                throw new common_1.BadRequestException(`${key} is invalid.`);
            }
            return value.trim() || null;
        };
        return {
            available: record.available,
            preferences: record.available ? text('preferences') : null,
            comments: record.available ? text('comments') : null,
        };
    }
    idpStatusInput(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new common_1.BadRequestException('IDP status values are required.');
        }
        const record = body;
        const keys = ['available', 'comments'];
        if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
            throw new common_1.BadRequestException('IDP status must contain exactly available and comments.');
        }
        if (typeof record.available !== 'boolean') {
            throw new common_1.BadRequestException('IDP availability must be Yes or No.');
        }
        if (!record.available)
            return { available: false, comments: null };
        if (record.comments === null || record.comments === '') {
            return { available: true, comments: null };
        }
        if (typeof record.comments !== 'string' || record.comments.trim().length > 4000) {
            throw new common_1.BadRequestException('comments is invalid.');
        }
        return { available: true, comments: record.comments.trim() || null };
    }
    persNo(value) {
        if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n)
            throw new common_1.BadRequestException('Pers.No is invalid.');
        return value;
    }
    uuid(value) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
            throw new common_1.BadRequestException('Career Journey event ID is invalid.');
        return value;
    }
    async run(operation, failureMessage = 'Unable to update Career Journey.') {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error?.code === '23505')
                throw new common_1.ConflictException('A Career Journey event already exists for this employee and month.');
            this.logger.error(failureMessage);
            throw new common_1.InternalServerErrorException(failureMessage);
        }
    }
    normalize(input) {
        const value = (item, label, maxLength = 200) => {
            if (item === undefined || item === '')
                return null;
            if (typeof item !== 'string' || item.length > maxLength) {
                throw new common_1.BadRequestException(`${label} is invalid`);
            }
            return item.trim() || null;
        };
        return {
            search: value(input.search, 'Search', 100),
            functionName: value(input.functionName, 'Function filter'),
            orgUnit: value(input.orgUnit, 'Organizational unit filter'),
            range: value(input.range, 'Range filter'),
            location: value(input.location, 'Location filter'),
            gender: value(input.gender, 'Gender filter'),
            directOrIndirect: value(input.directOrIndirect, 'Direct or indirect filter'),
        };
    }
};
exports.Employee360Service = Employee360Service;
exports.Employee360Service = Employee360Service = Employee360Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employee_360_repository_1.Employee360Repository,
        career_journey_repository_1.CareerJourneyRepository])
], Employee360Service);
//# sourceMappingURL=employee-360.service.js.map