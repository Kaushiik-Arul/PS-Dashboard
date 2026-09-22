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
exports.Employee360Service = void 0;
const common_1 = require("@nestjs/common");
const employee_360_repository_1 = require("./employee-360.repository");
let Employee360Service = class Employee360Service {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getEmployees(input, user) {
        return this.repository.getEmployees(this.normalize(input), user.accountId, user.persNo);
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
exports.Employee360Service = Employee360Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employee_360_repository_1.Employee360Repository])
], Employee360Service);
//# sourceMappingURL=employee-360.service.js.map