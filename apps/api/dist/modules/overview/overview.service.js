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
var OverviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewService = void 0;
const common_1 = require("@nestjs/common");
const overview_repository_1 = require("./overview.repository");
let OverviewService = OverviewService_1 = class OverviewService {
    repository;
    logger = new common_1.Logger(OverviewService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async getOverview() {
        try {
            return await this.repository.getOverview();
        }
        catch {
            this.logger.error('Overview database query failed');
            throw new common_1.InternalServerErrorException('Unable to load the workforce overview');
        }
    }
};
exports.OverviewService = OverviewService;
exports.OverviewService = OverviewService = OverviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [overview_repository_1.OverviewRepository])
], OverviewService);
//# sourceMappingURL=overview.service.js.map