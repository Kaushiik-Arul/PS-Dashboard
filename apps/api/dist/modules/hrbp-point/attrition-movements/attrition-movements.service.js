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
var AttritionMovementsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttritionMovementsService = void 0;
const common_1 = require("@nestjs/common");
const attrition_movements_repository_1 = require("./attrition-movements.repository");
const attrition_movements_types_1 = require("./attrition-movements.types");
let AttritionMovementsService = AttritionMovementsService_1 = class AttritionMovementsService {
    repository;
    logger = new common_1.Logger(AttritionMovementsService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async list(viewInput, searchInput, yearInput, monthInput, pageInput, pageSizeInput) {
        const view = (viewInput?.trim() || 'all');
        if (!attrition_movements_types_1.attritionMovementViews.includes(view))
            throw new common_1.BadRequestException('Attrition movement view is invalid.');
        const search = searchInput?.trim() ?? '';
        if (search.length > 100)
            throw new common_1.BadRequestException('Search must not exceed 100 characters.');
        const year = this.optionalInteger(yearInput, 'Year', 2000, 2100);
        const month = this.optionalInteger(monthInput, 'Month', 1, 12);
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        return this.run(() => this.repository.list(view, search, year, month, page, pageSize), 'Unable to load attrition movements');
    }
    async dismissCandidate(candidateId, actor) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
            throw new common_1.BadRequestException('Invalid departure candidate ID.');
        }
        const dismissed = await this.run(() => this.repository.dismissCandidate(candidateId, actor), 'Unable to dismiss the departure candidate');
        if (!dismissed)
            throw new common_1.NotFoundException('Pending departure candidate was not found.');
    }
    optionalInteger(value, label, minimum, maximum) {
        if (value === undefined || value.trim() === '')
            return null;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException(`${label} must be a whole number.`);
        const parsed = Number(value);
        if (parsed < minimum || parsed > maximum)
            throw new common_1.BadRequestException(`${label} must be between ${minimum} and ${maximum}.`);
        return parsed;
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
    async run(operation, message) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            this.logger.error(message);
            throw new common_1.InternalServerErrorException(message);
        }
    }
};
exports.AttritionMovementsService = AttritionMovementsService;
exports.AttritionMovementsService = AttritionMovementsService = AttritionMovementsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attrition_movements_repository_1.AttritionMovementsRepository])
], AttritionMovementsService);
//# sourceMappingURL=attrition-movements.service.js.map